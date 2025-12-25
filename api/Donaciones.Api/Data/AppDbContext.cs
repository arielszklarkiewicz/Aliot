using Donaciones.Api.Models;
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Donor> Donors => Set<Donor>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Concept> Concepts => Set<Concept>();
    public DbSet<Destination> Destinations => Set<Destination>();
    public DbSet<Collector> Collectors => Set<Collector>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Username).HasColumnName("username").IsRequired();
            e.Property(x => x.PasswordHash).HasColumnName("password_hash").IsRequired();
            e.Property(x => x.FullName).HasColumnName("full_name");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.Role).HasColumnName("role").IsRequired();
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.Username).IsUnique();
        });

        // Donor
        modelBuilder.Entity<Donor>(e =>
        {
            e.ToTable("donors");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.FirstName).HasColumnName("first_name").IsRequired();
            e.Property(x => x.LastName).HasColumnName("last_name");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.Observations).HasColumnName("observations");
            e.Property(x => x.IsOccasionalDonor).HasColumnName("is_occasional_donor");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        // Donation
        modelBuilder.Entity<Donation>(e =>
        {
            e.ToTable("donations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.DonorId).HasColumnName("donor_id");
            e.Property(x => x.Currency).HasColumnName("currency").IsRequired();
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.DonationDate).HasColumnName("donation_date");
            e.Property(x => x.Perasha).HasColumnName("perasha");
            e.Property(x => x.Minian).HasColumnName("minian").IsRequired();
            e.Property(x => x.Concept).HasColumnName("concept").IsRequired();
            e.Property(x => x.Destination).HasColumnName("destination").IsRequired();
            e.Property(x => x.DestinationOther).HasColumnName("destination_other");
            e.Property(x => x.Comment).HasColumnName("comment");
            e.Property(x => x.IsVirtual).HasColumnName("is_virtual").HasDefaultValue(false);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            e.HasOne<Donor>()
                .WithMany()
                .HasForeignKey(x => x.DonorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Payment
        modelBuilder.Entity<Payment>(e =>
        {
            e.ToTable("payments");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.DonorId).HasColumnName("donor_id");
            e.Property(x => x.Currency).HasColumnName("currency").IsRequired();
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.PaymentDate).HasColumnName("payment_date");
            e.Property(x => x.Destination).HasColumnName("destination").IsRequired();
            e.Property(x => x.Collector).HasColumnName("collector");
            e.Property(x => x.Comment).HasColumnName("comment");
            e.Property(x => x.IsVirtual).HasColumnName("is_virtual").HasDefaultValue(false);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            e.HasOne<Donor>()
                .WithMany()
                .HasForeignKey(x => x.DonorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Concept lookup
        modelBuilder.Entity<Concept>(e =>
        {
            e.ToTable("concepts");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.Name).IsUnique();
        });

        // Destination lookup
        modelBuilder.Entity<Destination>(e =>
        {
            e.ToTable("destinations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.Name).IsUnique();
        });

        // Collector lookup
        modelBuilder.Entity<Collector>(e =>
        {
            e.ToTable("collectors");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.Name).IsUnique();
        });
    }
}
