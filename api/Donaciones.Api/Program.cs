using System.Text.Json.Serialization;
using Donaciones.Api.Models;
using Donaciones.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Basic services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// CORS from env var Cors__AllowedOrigins (comma separated)
var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"] ?? builder.Configuration["Cors__AllowedOrigins"];
builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        if (!string.IsNullOrWhiteSpace(allowedOrigins))
        {
            var origins = allowedOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
    });
});

// Database registration: prefer Npgsql if connection string is provided, otherwise fallback to InMemory for dev
var connStr = builder.Configuration.GetConnectionString("Default")
              ?? builder.Configuration["ConnectionStrings:Default"]
              ?? builder.Configuration["ConnectionStrings__Default"];
if (!string.IsNullOrWhiteSpace(connStr))
{
    builder.Services.AddDbContext<AppDbContext>(opt => opt.UseNpgsql(connStr));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(opt => opt.UseInMemoryDatabase("donaciones_dev"));
}

// Services
builder.Services.AddScoped<IDonorService, DonorService>();
builder.Services.AddScoped<IDonationService, DonationService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();

var app = builder.Build();

// Ensure DB exists (for dev and first run). In production with PostgreSQL, it will create basic tables when missing.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try { db.Database.EnsureCreated(); } catch { /* ignore if not possible */ }
}

// Pipeline
app.UseCors("Default");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Health
app.MapGet("/healthz", () => Results.Ok(new { status = "ok", time = DateTimeOffset.UtcNow }))
   .WithName("Healthz");

// Lookups (DB-backed for concepts/destinations/collectors; with sensible defaults if empty)
app.MapGet("/api/lookups", async (AppDbContext db, CancellationToken ct) =>
{
    var currencies = new[] { "Pesos", "Dolares" };
    var minian = new[] { "Ashkenazi", "Sefaradi", "Netz" };

    // Seed defaults if tables are empty
    if (!await db.Concepts.AsNoTracking().AnyAsync(ct))
    {
        db.Concepts.AddRange(new[]
        {
            new Concept { Id = Guid.NewGuid(), Name = "1. Cohen", CreatedAt = DateTimeOffset.UtcNow },
            new Concept { Id = Guid.NewGuid(), Name = "2. Levi", CreatedAt = DateTimeOffset.UtcNow },
            new Concept { Id = Guid.NewGuid(), Name = "3ro", CreatedAt = DateTimeOffset.UtcNow },
            new Concept { Id = Guid.NewGuid(), Name = "4to", CreatedAt = DateTimeOffset.UtcNow },
            new Concept { Id = Guid.NewGuid(), Name = "5to", CreatedAt = DateTimeOffset.UtcNow },
            new Concept { Id = Guid.NewGuid(), Name = "6to", CreatedAt = DateTimeOffset.UtcNow },
            new Concept { Id = Guid.NewGuid(), Name = "7mo", CreatedAt = DateTimeOffset.UtcNow },
            new Concept { Id = Guid.NewGuid(), Name = "Mosif", CreatedAt = DateTimeOffset.UtcNow },
            new Concept { Id = Guid.NewGuid(), Name = "Mashlim", CreatedAt = DateTimeOffset.UtcNow },
        });
    }
    if (!await db.Destinations.AsNoTracking().AnyAsync(ct))
    {
        db.Destinations.AddRange(new[]
        {
            new Destination { Id = Guid.NewGuid(), Name = "Yeshiva", CreatedAt = DateTimeOffset.UtcNow },
            new Destination { Id = Guid.NewGuid(), Name = "Ashkenazi Minian", CreatedAt = DateTimeOffset.UtcNow },
            new Destination { Id = Guid.NewGuid(), Name = "Other", CreatedAt = DateTimeOffset.UtcNow },
        });
    }
    await db.SaveChangesAsync(ct);

    var donationConcepts = await db.Concepts.AsNoTracking().OrderBy(c => c.Name).Select(c => c.Name).ToListAsync(ct);
    var destinations = await db.Destinations.AsNoTracking().OrderBy(d => d.Name).Select(d => d.Name).ToListAsync(ct);
    var collectors = await db.Collectors.AsNoTracking().OrderBy(c => c.Name).Select(c => c.Name).ToListAsync(ct);

    return Results.Ok(new { currencies, minian, donationConcepts, destinations, collectors });
});

// Auth (dummy login that returns a fake token)
app.MapPost("/api/auth/login", (LoginRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        return Results.Unauthorized();

    var user = new { id = Guid.NewGuid(), email = req.Email, fullName = req.Email.Split('@')[0], roles = new[] { "Staff" } };
    var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
    return Results.Ok(new { accessToken = token, expiresIn = 3600, user });
});

// Auth with Google SSO
app.MapPost("/api/auth/google", async (GoogleLoginRequest req, IConfiguration config) =>
{
    if (string.IsNullOrWhiteSpace(req.IdToken))
        return Results.BadRequest(new { error = "Missing idToken" });

    var googleClientId = config["Google:ClientId"] ?? config["Google__ClientId"];
    if (string.IsNullOrWhiteSpace(googleClientId))
        return Results.Problem(title: "Google client ID not configured", statusCode: 500);

    try
    {
        var settings = new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new[] { googleClientId }
        };
        var payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(req.IdToken, settings);
        if (payload == null || string.IsNullOrWhiteSpace(payload.Email))
            return Results.Unauthorized();

        var user = new
        {
            id = Guid.NewGuid(),
            email = payload.Email,
            fullName = payload.Name ?? payload.Email,
            roles = new[] { "Staff" }
        };
        // For now we return a fake token; can be replaced by real JWT.
        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        return Results.Ok(new { accessToken = token, expiresIn = 3600, user });
    }
    catch (Exception ex)
    {
        return Results.Unauthorized();
    }
});

// Donors
app.MapGet("/api/donors", async (IDonorService svc, string? q, bool? isOccasionalDonor, int page = 1, int pageSize = 20, CancellationToken ct = default) =>
{
    var (items, total) = await svc.ListAsync(q, isOccasionalDonor, page, pageSize, ct);
    return Results.Ok(new { items, total, page, pageSize });
});

app.MapPost("/api/donors", async (IDonorService svc, Donor donor, CancellationToken ct) =>
{
    var created = await svc.CreateAsync(donor, ct);
    return Results.Created($"/api/donors/{created.Id}", created);
});

app.MapGet("/api/donors/{id:guid}", async (IDonorService svc, Guid id, CancellationToken ct) =>
{
    var d = await svc.GetAsync(id, ct);
    return d is not null ? Results.Ok(d) : Results.NotFound();
});

app.MapGet("/api/donors/{id:guid}/balance", async (IDonorService svc, Guid id, string? currency, CancellationToken ct) =>
{
    var bal = await svc.GetBalanceAsync(id, currency, ct);
    return Results.Ok(bal);
});

app.MapGet("/api/donors/{id:guid}/summary", async (IDonorService svc, Guid id, CancellationToken ct) =>
{
    var summary = await svc.GetSummaryAsync(id, ct);
    return summary is not null ? Results.Ok(summary) : Results.NotFound();
});

app.MapPut("/api/donors/{id:guid}", async (IDonorService svc, Guid id, Donor donor, CancellationToken ct) =>
{
    donor.Id = id;
    var updated = await svc.UpdateAsync(id, donor, ct);
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
});

app.MapDelete("/api/donors/{id:guid}", async (IDonorService svc, Guid id, CancellationToken ct) =>
{
    var ok = await svc.DeleteAsync(id, ct);
    return ok ? Results.NoContent() : Results.NotFound();
});

// Donations
app.MapGet("/api/donations", async (IDonationService svc, Guid? donorId, string? currency, string? minian, string? concept, string? destination, bool? isOccasionalDonor, DateOnly? from, DateOnly? to, int page = 1, int pageSize = 20, CancellationToken ct = default) =>
{
    // Translate legacy query param isOccasionalDonor into service parameter IncludeOcasionalDonors (default true)
    var IncludeOcasionalDonors = !(isOccasionalDonor.HasValue && isOccasionalDonor.Value == false);
    var (items, total) = await svc.ListAsync(donorId, currency, minian, concept, destination, IncludeOcasionalDonors, from, to, page, pageSize, ct);
    return Results.Ok(new { items, total, page, pageSize });
});

app.MapPost("/api/donations", async (IDonationService svc, DonationCreate dto, CancellationToken ct) =>
{
    var created = await svc.CreateAsync(dto, ct);
    return created is not null ? Results.Created($"/api/donations/{created.Id}", created) : Results.BadRequest(new { error = "Validation failed" });
});

app.MapGet("/api/donations/{id:guid}", async (IDonationService svc, Guid id, CancellationToken ct) =>
{
    var d = await svc.GetAsync(id, ct);
    return d is not null ? Results.Ok(d) : Results.NotFound();
});

app.MapPut("/api/donations/{id:guid}", async (IDonationService svc, Guid id, DonationCreate dto, CancellationToken ct) =>
{
    var updated = await svc.UpdateAsync(id, dto, ct);
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
});

app.MapDelete("/api/donations/{id:guid}", async (IDonationService svc, Guid id, CancellationToken ct) =>
{
    var ok = await svc.DeleteAsync(id, ct);
    return ok ? Results.NoContent() : Results.NotFound();
});

// Payments
app.MapGet("/api/payments", async (IPaymentService svc, Guid? donorId, string? currency, string? collector, DateOnly? from, DateOnly? to, int page = 1, int pageSize = 20, CancellationToken ct = default) =>
{
    var (items, total) = await svc.ListAsync(donorId, currency, collector, from, to, page, pageSize, ct);
    return Results.Ok(new { items, total, page, pageSize });
});

app.MapPost("/api/payments", async (IPaymentService svc, PaymentCreate dto, CancellationToken ct) =>
{
    var created = await svc.CreateAsync(dto, ct);
    return created is not null ? Results.Created($"/api/payments/{created.Id}", created) : Results.BadRequest(new { error = "Validation failed" });
});

app.MapGet("/api/payments/{id:guid}", async (IPaymentService svc, Guid id, CancellationToken ct) =>
{
    var p = await svc.GetAsync(id, ct);
    return p is not null ? Results.Ok(p) : Results.NotFound();
});

app.MapPut("/api/payments/{id:guid}", async (IPaymentService svc, Guid id, PaymentCreate dto, CancellationToken ct) =>
{
    var updated = await svc.UpdateAsync(id, dto, ct);
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
});

app.MapDelete("/api/payments/{id:guid}", async (IPaymentService svc, Guid id, CancellationToken ct) =>
{
    var ok = await svc.DeleteAsync(id, ct);
    return ok ? Results.NoContent() : Results.NotFound();
});

// Reports: donors with non-zero saldo by currency (no date filter)
app.MapGet("/api/reports/donor-balances", async (AppDbContext db, CancellationToken ct) =>
{
    var donations = await db.Donations.AsNoTracking()
        .GroupBy(d => new { d.DonorId, Currency = d.Currency.ToLower() })
        .Select(g => new { g.Key.DonorId, g.Key.Currency, Total = g.Sum(x => (decimal)x.Amount) })
        .ToListAsync(ct);

    var payments = await db.Payments.AsNoTracking()
        .GroupBy(p => new { p.DonorId, Currency = p.Currency.ToLower() })
        .Select(g => new { g.Key.DonorId, g.Key.Currency, Total = g.Sum(x => (decimal)x.Amount) })
        .ToListAsync(ct);

    var donors = await db.Donors.AsNoTracking()
        .Select(d => new { d.Id, d.FirstName, d.LastName })
        .ToListAsync(ct);

    var keys = donations.Select(x => new { x.DonorId, x.Currency })
        .Union(payments.Select(x => new { x.DonorId, x.Currency }))
        .ToList();

    var rows = keys
        .Select(k =>
        {
            var d = donors.FirstOrDefault(dd => dd.Id == k.DonorId);
            var donationsTotal = donations.FirstOrDefault(x => x.DonorId == k.DonorId && x.Currency == k.Currency)?.Total ?? 0m;
            var paymentsTotal = payments.FirstOrDefault(x => x.DonorId == k.DonorId && x.Currency == k.Currency)?.Total ?? 0m;
            var saldo = donationsTotal - paymentsTotal;
            return new
            {
                donorId = k.DonorId,
                donorName = d == null ? "(Desconocido)" : (string.IsNullOrWhiteSpace(d.LastName) ? d.FirstName : ($"{d.FirstName} {d.LastName}")),
                currency = k.Currency,
                donationsTotal,
                paymentsTotal,
                saldo
            };
        })
        .Where(r => r.saldo != 0m)
        .OrderBy(r => r.donorName)
        .ThenBy(r => r.currency)
        .ToList();

    return Results.Ok(new { items = rows, total = rows.Count });
});

// Autocomplete (from DB)
app.MapGet("/api/autocomplete/perashot", async (AppDbContext db, string? q, int limit = 10, CancellationToken ct = default) =>
{
    IQueryable<Donation> baseQry = db.Donations.AsNoTracking().Where(d => d.Perasha != null);
    if (!string.IsNullOrWhiteSpace(q))
    {
        baseQry = baseQry.Where(d => d.Perasha!.ToLower().Contains(q.ToLower()));
    }

    var vals = await baseQry
        .Select(d => d.Perasha!)
        .Distinct()
        .OrderBy(s => s)
        .Take(limit)
        .ToListAsync(ct);
    return Results.Ok(vals);
});

app.MapGet("/api/autocomplete/collectors", async (AppDbContext db, string q, int limit = 10, CancellationToken ct = default) =>
{
    var vals = await db.Payments.AsNoTracking()
        .Where(p => p.Collector != null && p.Collector.ToLower().Contains(q.ToLower()))
        .Select(p => p.Collector!)
        .Distinct()
        .Take(limit)
        .ToListAsync(ct);
    return Results.Ok(vals);
});

// Admin: Concepts
app.MapGet("/api/admin/concepts", async (AppDbContext db, CancellationToken ct) =>
{
    var items = await db.Concepts.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
    return Results.Ok(new { items });
});

app.MapPost("/api/admin/concepts", async (AppDbContext db, Concept dto, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(dto.Name)) return Results.BadRequest(new { error = "Name is required" });
    var exists = await db.Concepts.AnyAsync(x => x.Name.ToLower() == dto.Name.ToLower(), ct);
    if (exists) return Results.Conflict(new { error = "A concept with this name already exists" });
    var entity = new Concept { Id = Guid.NewGuid(), Name = dto.Name.Trim(), CreatedAt = DateTimeOffset.UtcNow };
    db.Concepts.Add(entity);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/api/admin/concepts/{entity.Id}", entity);
});

app.MapPut("/api/admin/concepts/{id:guid}", async (AppDbContext db, Guid id, Concept dto, CancellationToken ct) =>
{
    var entity = await db.Concepts.FirstOrDefaultAsync(x => x.Id == id, ct);
    if (entity is null) return Results.NotFound();
    if (string.IsNullOrWhiteSpace(dto.Name)) return Results.BadRequest(new { error = "Name is required" });
    var exists = await db.Concepts.AnyAsync(x => x.Id != id && x.Name.ToLower() == dto.Name.ToLower(), ct);
    if (exists) return Results.Conflict(new { error = "A concept with this name already exists" });
    entity.Name = dto.Name.Trim();
    entity.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok(entity);
});

app.MapDelete("/api/admin/concepts/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
{
    var entity = await db.Concepts.FirstOrDefaultAsync(x => x.Id == id, ct);
    if (entity is null) return Results.NotFound();
    // Block delete if referenced in donations
    var usedInDonations = await db.Donations.AnyAsync(d => d.Concept == entity.Name, ct);
    if (usedInDonations)
        return Results.Conflict(new { error = "Cannot delete: concept is already used by donations" });
    db.Concepts.Remove(entity);
    await db.SaveChangesAsync(ct);
    return Results.NoContent();
});

// Admin: Destinations
app.MapGet("/api/admin/destinations", async (AppDbContext db, CancellationToken ct) =>
{
    var items = await db.Destinations.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
    return Results.Ok(new { items });
});

app.MapPost("/api/admin/destinations", async (AppDbContext db, Destination dto, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(dto.Name)) return Results.BadRequest(new { error = "Name is required" });
    var exists = await db.Destinations.AnyAsync(x => x.Name.ToLower() == dto.Name.ToLower(), ct);
    if (exists) return Results.Conflict(new { error = "A destination with this name already exists" });
    var entity = new Destination { Id = Guid.NewGuid(), Name = dto.Name.Trim(), CreatedAt = DateTimeOffset.UtcNow };
    db.Destinations.Add(entity);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/api/admin/destinations/{entity.Id}", entity);
});

app.MapPut("/api/admin/destinations/{id:guid}", async (AppDbContext db, Guid id, Destination dto, CancellationToken ct) =>
{
    var entity = await db.Destinations.FirstOrDefaultAsync(x => x.Id == id, ct);
    if (entity is null) return Results.NotFound();
    if (string.IsNullOrWhiteSpace(dto.Name)) return Results.BadRequest(new { error = "Name is required" });
    var exists = await db.Destinations.AnyAsync(x => x.Id != id && x.Name.ToLower() == dto.Name.ToLower(), ct);
    if (exists) return Results.Conflict(new { error = "A destination with this name already exists" });
    entity.Name = dto.Name.Trim();
    entity.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok(entity);
});

app.MapDelete("/api/admin/destinations/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
{
    var entity = await db.Destinations.FirstOrDefaultAsync(x => x.Id == id, ct);
    if (entity is null) return Results.NotFound();
    // Block delete if referenced in donations
    var usedInDonations = await db.Donations.AnyAsync(d => d.Destination == entity.Name, ct);
    if (usedInDonations)
        return Results.Conflict(new { error = "Cannot delete: destination is already used by donations" });
    db.Destinations.Remove(entity);
    await db.SaveChangesAsync(ct);
    return Results.NoContent();
});

// Admin: Collectors
app.MapGet("/api/admin/collectors", async (AppDbContext db, CancellationToken ct) =>
{
    var items = await db.Collectors.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
    return Results.Ok(new { items });
});

app.MapPost("/api/admin/collectors", async (AppDbContext db, Collector dto, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(dto.Name)) return Results.BadRequest(new { error = "Name is required" });
    var exists = await db.Collectors.AnyAsync(x => x.Name.ToLower() == dto.Name.ToLower(), ct);
    if (exists) return Results.Conflict(new { error = "A collector with this name already exists" });
    var entity = new Collector { Id = Guid.NewGuid(), Name = dto.Name.Trim(), CreatedAt = DateTimeOffset.UtcNow };
    db.Collectors.Add(entity);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/api/admin/collectors/{entity.Id}", entity);
});

app.MapPut("/api/admin/collectors/{id:guid}", async (AppDbContext db, Guid id, Collector dto, CancellationToken ct) =>
{
    var entity = await db.Collectors.FirstOrDefaultAsync(x => x.Id == id, ct);
    if (entity is null) return Results.NotFound();
    if (string.IsNullOrWhiteSpace(dto.Name)) return Results.BadRequest(new { error = "Name is required" });
    var exists = await db.Collectors.AnyAsync(x => x.Id != id && x.Name.ToLower() == dto.Name.ToLower(), ct);
    if (exists) return Results.Conflict(new { error = "A collector with this name already exists" });
    entity.Name = dto.Name.Trim();
    entity.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok(entity);
});

app.MapDelete("/api/admin/collectors/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
{
    var entity = await db.Collectors.FirstOrDefaultAsync(x => x.Id == id, ct);
    if (entity is null) return Results.NotFound();
    // Block delete if referenced in payments
    var usedInPayments = await db.Payments.AnyAsync(p => p.Collector == entity.Name, ct);
    if (usedInPayments)
        return Results.Conflict(new { error = "Cannot delete: collector is already used by payments" });
    db.Collectors.Remove(entity);
    await db.SaveChangesAsync(ct);
    return Results.NoContent();
});

app.Run();

