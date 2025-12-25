using System.Text;
using System.Text.Json.Serialization;
using Donaciones.Api.Authorization;
using Donaciones.Api.Models;
using Donaciones.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Basic services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? builder.Configuration["Jwt__Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    // Use a default secret for development only
    jwtSecret = "ThisIsADevelopmentSecretKeyThatIsAtLeast32CharactersLong!";
    Console.WriteLine("WARNING: Using default JWT secret. Set Jwt:Secret in configuration for production.");
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? builder.Configuration["Jwt__Issuer"] ?? "Donaciones.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? builder.Configuration["Jwt__Audience"] ?? "Donaciones.Client";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero
        };
        
        // Handle authentication failures
        options.Events = new JwtBearerEvents
        {
            OnChallenge = context =>
            {
                context.HandleResponse();
                
                // Check if this is an API request
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = 401;
                    context.Response.ContentType = "application/json";
                    return context.Response.WriteAsJsonAsync(new { error = "Unauthorized", message = "Please login to access this resource" });
                }
                else
                {
                    // For non-API requests, redirect to login
                    context.Response.Redirect("/login");
                    return Task.CompletedTask;
                }
            }
        };
    });

builder.Services.AddAuthorization();

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
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDonorService, DonorService>();
builder.Services.AddScoped<IDonationService, DonationService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();

var app = builder.Build();

// Apply database migrations automatically on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try 
    { 
        logger.LogInformation("Applying database migrations...");
        db.Database.Migrate();
        logger.LogInformation("Database migrations applied successfully");
        
        // Seed default admin user if no users exist
        var hasUsers = await db.Users.AnyAsync();
        if (!hasUsers)
        {
            logger.LogInformation("No users found. Creating default admin user...");
            await authService.CreateUserAsync("admin@admin.com", "admin123", UserRole.Admin, "System Administrator");
            logger.LogInformation("Default admin user created: email='admin@admin.com', password='admin123' (CHANGE THIS!)");
        }
    } 
    catch (Exception ex) 
    { 
        logger.LogError(ex, "Error applying database migrations");
        // For InMemory database, fall back to EnsureCreated
        if (db.Database.IsInMemory())
        {
            logger.LogInformation("Using InMemory database, calling EnsureCreated");
            db.Database.EnsureCreated();
            
            // Seed default admin user for in-memory database
            var hasUsers = await db.Users.AnyAsync();
            if (!hasUsers)
            {
                logger.LogInformation("Creating default admin user for in-memory database...");
                await authService.CreateUserAsync("admin@admin.com", "admin123", UserRole.Admin, "System Administrator");
            }
        }
    }
}

// Pipeline
app.UseCors("Default");
app.UseAuthentication();
app.UseAuthorization();

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
            new Destination { Id = Guid.NewGuid(), Name = "Minian Ashkenazi", CreatedAt = DateTimeOffset.UtcNow },
            new Destination { Id = Guid.NewGuid(), Name = "Colel Tzeirim", CreatedAt = DateTimeOffset.UtcNow },
            new Destination { Id = Guid.NewGuid(), Name = "Colel Erev", CreatedAt = DateTimeOffset.UtcNow },
            new Destination { Id = Guid.NewGuid(), Name = "Ohel Moshe", CreatedAt = DateTimeOffset.UtcNow },
            new Destination { Id = Guid.NewGuid(), Name = "Seminario", CreatedAt = DateTimeOffset.UtcNow },
            new Destination { Id = Guid.NewGuid(), Name = "Other", CreatedAt = DateTimeOffset.UtcNow },
        });
    }
    if (!await db.Collectors.AsNoTracking().AnyAsync(ct))
    {
        db.Collectors.AddRange(new[]
        {
            new Collector { Id = Guid.NewGuid(), Name = "Ezra", CreatedAt = DateTimeOffset.UtcNow },
            new Collector { Id = Guid.NewGuid(), Name = "Marcelo", CreatedAt = DateTimeOffset.UtcNow },
            new Collector { Id = Guid.NewGuid(), Name = "Rab Dines", CreatedAt = DateTimeOffset.UtcNow },
            new Collector { Id = Guid.NewGuid(), Name = "Kupa", CreatedAt = DateTimeOffset.UtcNow },
            new Collector { Id = Guid.NewGuid(), Name = "Rab Pinjas Pasteloff", CreatedAt = DateTimeOffset.UtcNow },
            new Collector { Id = Guid.NewGuid(), Name = "Rab Pinjas Corin", CreatedAt = DateTimeOffset.UtcNow },
            new Collector { Id = Guid.NewGuid(), Name = "Transferencia", CreatedAt = DateTimeOffset.UtcNow },
            new Collector { Id = Guid.NewGuid(), Name = "Elazar", CreatedAt = DateTimeOffset.UtcNow },
            new Collector { Id = Guid.NewGuid(), Name = "Ari Grunblatt", CreatedAt = DateTimeOffset.UtcNow },
            new Collector { Id = Guid.NewGuid(), Name = "Ari Szklarkiewicz", CreatedAt = DateTimeOffset.UtcNow },
        });
    }
    await db.SaveChangesAsync(ct);

    var donationConcepts = await db.Concepts.AsNoTracking().OrderBy(c => c.Name).Select(c => c.Name).ToListAsync(ct);
    var destinations = await db.Destinations.AsNoTracking().OrderBy(d => d.Name).Select(d => d.Name).ToListAsync(ct);
    var collectors = await db.Collectors.AsNoTracking().OrderBy(c => c.Name).Select(c => c.Name).ToListAsync(ct);

    return Results.Ok(new { currencies, minian, donationConcepts, destinations, collectors });
});

// Auth endpoints
app.MapPost("/api/auth/login", async (IAuthService authService, LoginCredentials req) =>
{
    var result = await authService.AuthenticateAsync(req.Email, req.Password);
    
    if (result == null)
        return Results.Unauthorized();

    var (token, user) = result.Value;
    var expiryMinutes = int.TryParse(builder.Configuration["Jwt:ExpiryMinutes"] ?? builder.Configuration["Jwt__ExpiryMinutes"], out var mins) ? mins : 480;

    var response = new AuthResponse
    {
        AccessToken = token,
        ExpiresIn = expiryMinutes * 60,
        User = new UserInfo
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName ?? user.Email,
            Role = user.Role.ToString(),
            Permissions = user.Role.GetPermissions().Select(p => p.ToString()).ToArray()
        }
    };

    return Results.Ok(response);
})
.WithName("Login")
.WithOpenApi();

// User management endpoints (Admin only)
app.MapGet("/api/admin/users", async (IAuthService authService, int page = 1, int pageSize = 20, CancellationToken ct = default) =>
{
    var (users, total) = await authService.ListUsersAsync(page, pageSize, ct);
    var items = users.Select(u => new
    {
        u.Id,
        u.Email,
        u.FullName,
        Role = u.Role.ToString(),
        u.IsActive,
        u.CreatedAt,
        u.UpdatedAt
    });
    return Results.Ok(new { items, total, page, pageSize });
})
.RequirePermission(Permission.ViewUsers)
.WithName("ListUsers")
.WithOpenApi();

app.MapGet("/api/admin/users/{id:guid}", async (IAuthService authService, Guid id, CancellationToken ct) =>
{
    var user = await authService.GetUserByIdAsync(id, ct);
    if (user == null)
        return Results.NotFound();
    
    return Results.Ok(new
    {
        user.Id,
        user.Email,
        user.FullName,
        Role = user.Role.ToString(),
        user.IsActive,
        user.CreatedAt,
        user.UpdatedAt
    });
})
.RequirePermission(Permission.ViewUsers)
.WithName("GetUser")
.WithOpenApi();

app.MapPost("/api/auth/users", async (IAuthService authService, CreateUserRequest req) =>
{
    try
    {
        var user = await authService.CreateUserAsync(req.Email, req.Password, req.Role, req.FullName);
        return Results.Created($"/api/auth/users/{user.Id}", new
        {
            user.Id,
            user.Email,
            user.FullName,
            Role = user.Role.ToString(),
            user.IsActive
        });
    }
    catch (InvalidOperationException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequirePermission(Permission.ManageUsers)
.WithName("CreateUser")
.WithOpenApi();

app.MapPut("/api/admin/users/{id:guid}", async (IAuthService authService, Guid id, UpdateUserRequest req, CancellationToken ct) =>
{
    var user = await authService.UpdateUserAsync(id, req.FullName, null, ct);
    if (user == null)
        return Results.NotFound();
    
    return Results.Ok(new
    {
        user.Id,
        user.Email,
        user.FullName,
        Role = user.Role.ToString(),
        user.IsActive
    });
})
.RequirePermission(Permission.ManageUsers)
.WithName("UpdateUser")
.WithOpenApi();

app.MapPost("/api/admin/users/{id:guid}/change-password", async (IAuthService authService, Guid id, AdminChangePasswordRequest req, CancellationToken ct) =>
{
    if (id != req.UserId)
        return Results.BadRequest(new { error = "User ID mismatch" });
    
    var success = await authService.AdminChangePasswordAsync(req.UserId, req.NewPassword, ct);
    if (!success)
        return Results.NotFound();
    
    return Results.Ok(new { message = "Password changed successfully" });
})
.RequirePermission(Permission.ManageUsers)
.WithName("AdminChangePassword")
.WithOpenApi();

app.MapPost("/api/admin/users/{id:guid}/toggle-active", async (IAuthService authService, Guid id, CancellationToken ct) =>
{
    var user = await authService.GetUserByIdAsync(id, ct);
    if (user == null)
        return Results.NotFound();
    
    var success = await authService.SetUserActiveStatusAsync(id, !user.IsActive, ct);
    return Results.Ok(new { isActive = !user.IsActive, message = $"User {(user.IsActive ? "deactivated" : "activated")} successfully" });
})
.RequirePermission(Permission.ManageUsers)
.WithName("ToggleUserActive")
.WithOpenApi();

app.MapDelete("/api/admin/users/{id:guid}", async (IAuthService authService, HttpContext httpContext, Guid id, CancellationToken ct) =>
{
    // Prevent deleting yourself
    var currentUserId = httpContext.User.GetUserId();
    if (currentUserId == id)
        return Results.BadRequest(new { error = "Cannot delete your own account" });
    
    var success = await authService.DeleteUserAsync(id, ct);
    if (!success)
        return Results.NotFound();
    
    return Results.NoContent();
})
.RequirePermission(Permission.ManageUsers)
.WithName("DeleteUser")
.WithOpenApi();

app.MapPost("/api/auth/change-password", async (IAuthService authService, HttpContext httpContext, ChangePasswordRequest req) =>
{
    var userId = httpContext.User.GetUserId();
    if (userId == null)
        return Results.Unauthorized();

    var success = await authService.ChangePasswordAsync(userId.Value, req.CurrentPassword, req.NewPassword);
    return success ? Results.Ok(new { message = "Password changed successfully" }) : Results.BadRequest(new { error = "Current password is incorrect" });
})
.RequireAuthorization()
.WithName("ChangePassword")
.WithOpenApi();

app.MapGet("/api/auth/me", async (IAuthService authService, HttpContext httpContext) =>
{
    var userId = httpContext.User.GetUserId();
    if (userId == null)
        return Results.Unauthorized();

    var user = await authService.GetUserByIdAsync(userId.Value);
    if (user == null)
        return Results.NotFound();

    return Results.Ok(new UserInfo
    {
        Id = user.Id,
        Email = user.Email,
        FullName = user.FullName ?? user.Email,
        Role = user.Role.ToString(),
        Permissions = user.Role.GetPermissions().Select(p => p.ToString()).ToArray()
    });
})
.RequireAuthorization()
.WithName("GetCurrentUser")
.WithOpenApi();

// Donors
app.MapGet("/api/donors", async (IDonorService svc, string? q, bool? isOccasionalDonor, int page = 1, int pageSize = 20, CancellationToken ct = default) =>
{
    var (items, total) = await svc.ListAsync(q, isOccasionalDonor, page, pageSize, ct);
    return Results.Ok(new { items, total, page, pageSize });
})
.RequirePermission(Permission.ViewDonors);

app.MapPost("/api/donors", async (IDonorService svc, Donor donor, CancellationToken ct) =>
{
    var created = await svc.CreateAsync(donor, ct);
    return Results.Created($"/api/donors/{created.Id}", created);
})
.RequirePermission(Permission.CreateDonors);

app.MapGet("/api/donors/{id:guid}", async (IDonorService svc, Guid id, CancellationToken ct) =>
{
    var d = await svc.GetAsync(id, ct);
    return d is not null ? Results.Ok(d) : Results.NotFound();
})
.RequirePermission(Permission.ViewDonors);

app.MapGet("/api/donors/{id:guid}/balance", async (IDonorService svc, Guid id, string? currency, CancellationToken ct) =>
{
    var bal = await svc.GetBalanceAsync(id, currency, ct);
    return Results.Ok(bal);
})
.RequirePermission(Permission.ViewDonors);

app.MapGet("/api/donors/{id:guid}/summary", async (IDonorService svc, Guid id, CancellationToken ct) =>
{
    var summary = await svc.GetSummaryAsync(id, ct);
    return summary is not null ? Results.Ok(summary) : Results.NotFound();
})
.RequirePermission(Permission.ViewDonorSummary);

app.MapPut("/api/donors/{id:guid}", async (IDonorService svc, Guid id, Donor donor, CancellationToken ct) =>
{
    donor.Id = id;
    var updated = await svc.UpdateAsync(id, donor, ct);
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
})
.RequirePermission(Permission.EditDonors);

app.MapDelete("/api/donors/{id:guid}", async (IDonorService svc, Guid id, CancellationToken ct) =>
{
    var ok = await svc.DeleteAsync(id, ct);
    return ok ? Results.NoContent() : Results.NotFound();
})
.RequirePermission(Permission.DeleteDonors);

// Donations
app.MapGet("/api/donations", async (IDonationService svc, Guid? donorId, string? currency, string? minian, string? concept, string? destination, bool? isOccasionalDonor, DateOnly? from, DateOnly? to, int page = 1, int pageSize = 20, CancellationToken ct = default) =>
{
    // Translate legacy query param isOccasionalDonor into service parameter IncludeOcasionalDonors (default true)
    var IncludeOcasionalDonors = !(isOccasionalDonor.HasValue && isOccasionalDonor.Value == false);
    var (items, total) = await svc.ListAsync(donorId, currency, minian, concept, destination, IncludeOcasionalDonors, from, to, page, pageSize, ct);
    return Results.Ok(new { items, total, page, pageSize });
})
.RequirePermission(Permission.ViewDonations);

app.MapPost("/api/donations", async (IDonationService svc, HttpContext httpContext, DonationCreate dto, CancellationToken ct) =>
{
    // Check virtual donation permission
    if (dto.IsVirtual)
    {
        var userRole = httpContext.User.GetUserRole();
        if (userRole == null || !userRole.Value.HasPermission(Permission.CreateVirtualDonations))
        {
            return Results.Forbid();
        }
    }
    
    var created = await svc.CreateAsync(dto, ct);
    return created is not null ? Results.Created($"/api/donations/{created.Id}", created) : Results.BadRequest(new { error = "Validation failed" });
})
.RequirePermission(Permission.CreateDonations);

app.MapGet("/api/donations/{id:guid}", async (IDonationService svc, Guid id, CancellationToken ct) =>
{
    var d = await svc.GetAsync(id, ct);
    return d is not null ? Results.Ok(d) : Results.NotFound();
})
.RequirePermission(Permission.ViewDonations);

app.MapPut("/api/donations/{id:guid}", async (IDonationService svc, HttpContext httpContext, Guid id, DonationCreate dto, CancellationToken ct) =>
{
    // Check virtual donation permission
    if (dto.IsVirtual)
    {
        var userRole = httpContext.User.GetUserRole();
        if (userRole == null || !userRole.Value.HasPermission(Permission.CreateVirtualDonations))
        {
            return Results.Forbid();
        }
    }
    
    var updated = await svc.UpdateAsync(id, dto, ct);
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
})
.RequirePermission(Permission.EditDonations);

app.MapDelete("/api/donations/{id:guid}", async (IDonationService svc, Guid id, CancellationToken ct) =>
{
    var ok = await svc.DeleteAsync(id, ct);
    return ok ? Results.NoContent() : Results.NotFound();
})
.RequirePermission(Permission.DeleteDonations);

// Payments
app.MapGet("/api/payments", async (IPaymentService svc, Guid? donorId, string? currency, string? collector, DateOnly? from, DateOnly? to, int page = 1, int pageSize = 20, CancellationToken ct = default) =>
{
    var (items, total) = await svc.ListAsync(donorId, currency, collector, from, to, page, pageSize, ct);
    return Results.Ok(new { items, total, page, pageSize });
})
.RequirePermission(Permission.ViewPayments);

app.MapPost("/api/payments", async (IPaymentService svc, HttpContext httpContext, PaymentCreate dto, CancellationToken ct) =>
{
    // Check virtual payment permission
    if (dto.IsVirtual)
    {
        var userRole = httpContext.User.GetUserRole();
        if (userRole == null || !userRole.Value.HasPermission(Permission.CreateVirtualPayments))
        {
            return Results.Forbid();
        }
    }
    
    var created = await svc.CreateAsync(dto, ct);
    return created is not null ? Results.Created($"/api/payments/{created.Id}", created) : Results.BadRequest(new { error = "Validation failed" });
})
.RequirePermission(Permission.CreatePayments);

app.MapGet("/api/payments/{id:guid}", async (IPaymentService svc, Guid id, CancellationToken ct) =>
{
    var p = await svc.GetAsync(id, ct);
    return p is not null ? Results.Ok(p) : Results.NotFound();
})
.RequirePermission(Permission.ViewPayments);

app.MapPut("/api/payments/{id:guid}", async (IPaymentService svc, HttpContext httpContext, Guid id, PaymentCreate dto, CancellationToken ct) =>
{
    // Check virtual payment permission
    if (dto.IsVirtual)
    {
        var userRole = httpContext.User.GetUserRole();
        if (userRole == null || !userRole.Value.HasPermission(Permission.CreateVirtualPayments))
        {
            return Results.Forbid();
        }
    }
    
    var updated = await svc.UpdateAsync(id, dto, ct);
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
})
.RequirePermission(Permission.EditPayments);

app.MapDelete("/api/payments/{id:guid}", async (IPaymentService svc, Guid id, CancellationToken ct) =>
{
    var ok = await svc.DeleteAsync(id, ct);
    return ok ? Results.NoContent() : Results.NotFound();
})
.RequirePermission(Permission.DeletePayments);

// Reports: donors with non-zero saldo by currency and destination (no date filter)
app.MapGet("/api/reports/donor-balances", async (AppDbContext db, CancellationToken ct) =>
{
    var donations = await db.Donations.AsNoTracking()
        .GroupBy(d => new { d.DonorId, Currency = d.Currency.ToLower(), d.Destination })
        .Select(g => new { g.Key.DonorId, g.Key.Currency, g.Key.Destination, Total = g.Sum(x => (decimal)x.Amount) })
        .ToListAsync(ct);

    var payments = await db.Payments.AsNoTracking()
        .GroupBy(p => new { p.DonorId, Currency = p.Currency.ToLower(), p.Destination })
        .Select(g => new { g.Key.DonorId, g.Key.Currency, g.Key.Destination, Total = g.Sum(x => (decimal)x.Amount) })
        .ToListAsync(ct);

    var donors = await db.Donors.AsNoTracking()
        .Select(d => new { d.Id, d.FirstName, d.LastName })
        .ToListAsync(ct);

    var keys = donations.Select(x => new { x.DonorId, x.Currency, x.Destination })
        .Union(payments.Select(x => new { x.DonorId, x.Currency, x.Destination }))
        .ToList();

    var rows = keys
        .Select(k =>
        {
            var d = donors.FirstOrDefault(dd => dd.Id == k.DonorId);
            var donationsTotal = donations.FirstOrDefault(x => x.DonorId == k.DonorId && x.Currency == k.Currency && x.Destination == k.Destination)?.Total ?? 0m;
            var paymentsTotal = payments.FirstOrDefault(x => x.DonorId == k.DonorId && x.Currency == k.Currency && x.Destination == k.Destination)?.Total ?? 0m;
            var saldo = donationsTotal - paymentsTotal;
            return new
            {
                donorId = k.DonorId,
                donorName = d == null ? "(Desconocido)" : (string.IsNullOrWhiteSpace(d.LastName) ? d.FirstName : ($"{d.FirstName} {d.LastName}")),
                currency = k.Currency,
                destino = k.Destination,
                donationsTotal,
                paymentsTotal,
                saldo
            };
        })
        .Where(r => r.saldo != 0m)
        .OrderBy(r => r.donorName)
        .ThenBy(r => r.destino)
        .ThenBy(r => r.currency)
        .ToList();

    return Results.Ok(new { items = rows, total = rows.Count });
})
.RequirePermission(Permission.ViewReports);

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
})
.RequirePermission(Permission.ViewDonations);

app.MapGet("/api/autocomplete/collectors", async (AppDbContext db, string q, int limit = 10, CancellationToken ct = default) =>
{
    var vals = await db.Payments.AsNoTracking()
        .Where(p => p.Collector != null && p.Collector.ToLower().Contains(q.ToLower()))
        .Select(p => p.Collector!)
        .Distinct()
        .Take(limit)
        .ToListAsync(ct);
    return Results.Ok(vals);
})
.RequirePermission(Permission.ViewPayments);

// Admin: Concepts
app.MapGet("/api/admin/concepts", async (AppDbContext db, CancellationToken ct) =>
{
    var items = await db.Concepts.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
    return Results.Ok(new { items });
})
.RequirePermission(Permission.ViewConcepts);

app.MapPost("/api/admin/concepts", async (AppDbContext db, Concept dto, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(dto.Name)) return Results.BadRequest(new { error = "Name is required" });
    var exists = await db.Concepts.AnyAsync(x => x.Name.ToLower() == dto.Name.ToLower(), ct);
    if (exists) return Results.Conflict(new { error = "A concept with this name already exists" });
    var entity = new Concept { Id = Guid.NewGuid(), Name = dto.Name.Trim(), CreatedAt = DateTimeOffset.UtcNow };
    db.Concepts.Add(entity);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/api/admin/concepts/{entity.Id}", entity);
})
.RequirePermission(Permission.ManageConcepts);

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
})
.RequirePermission(Permission.ManageConcepts);

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
})
.RequirePermission(Permission.ManageConcepts);

// Admin: Destinations
app.MapGet("/api/admin/destinations", async (AppDbContext db, CancellationToken ct) =>
{
    var items = await db.Destinations.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
    return Results.Ok(new { items });
})
.RequirePermission(Permission.ViewDestinations);

app.MapPost("/api/admin/destinations", async (AppDbContext db, Destination dto, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(dto.Name)) return Results.BadRequest(new { error = "Name is required" });
    var exists = await db.Destinations.AnyAsync(x => x.Name.ToLower() == dto.Name.ToLower(), ct);
    if (exists) return Results.Conflict(new { error = "A destination with this name already exists" });
    var entity = new Destination { Id = Guid.NewGuid(), Name = dto.Name.Trim(), CreatedAt = DateTimeOffset.UtcNow };
    db.Destinations.Add(entity);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/api/admin/destinations/{entity.Id}", entity);
})
.RequirePermission(Permission.ManageDestinations);

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
})
.RequirePermission(Permission.ManageDestinations);

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
})
.RequirePermission(Permission.ManageDestinations);

// Admin: Collectors
app.MapGet("/api/admin/collectors", async (AppDbContext db, CancellationToken ct) =>
{
    var items = await db.Collectors.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
    return Results.Ok(new { items });
})
.RequirePermission(Permission.ViewCollectors);

app.MapPost("/api/admin/collectors", async (AppDbContext db, Collector dto, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(dto.Name)) return Results.BadRequest(new { error = "Name is required" });
    var exists = await db.Collectors.AnyAsync(x => x.Name.ToLower() == dto.Name.ToLower(), ct);
    if (exists) return Results.Conflict(new { error = "A collector with this name already exists" });
    var entity = new Collector { Id = Guid.NewGuid(), Name = dto.Name.Trim(), CreatedAt = DateTimeOffset.UtcNow };
    db.Collectors.Add(entity);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/api/admin/collectors/{entity.Id}", entity);
})
.RequirePermission(Permission.ManageCollectors);

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
})
.RequirePermission(Permission.ManageCollectors);

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
})
.RequirePermission(Permission.ManageCollectors);

app.Run();

