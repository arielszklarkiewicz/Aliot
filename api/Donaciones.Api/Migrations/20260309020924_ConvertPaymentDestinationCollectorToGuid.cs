using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Donaciones.Api.Migrations
{
    /// <inheritdoc />
    public partial class ConvertPaymentDestinationCollectorToGuid : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Add new UUID columns (nullable initially to allow data migration)
            migrationBuilder.AddColumn<Guid>(
                name: "destination_id",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "collector_id",
                table: "payments",
                type: "uuid",
                nullable: true);

            // Step 2: Copy data from text columns to UUID columns
            // Convert destination text to UUID (assumes the text column already contains UUIDs as strings)
            migrationBuilder.Sql(@"
                UPDATE payments 
                SET destination_id = CAST(destination AS uuid) 
                WHERE destination IS NOT NULL 
                  AND destination ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            ");

            // Convert collector text to UUID (assumes the text column already contains UUIDs as strings or NULL)
            migrationBuilder.Sql(@"
                UPDATE payments 
                SET collector_id = CAST(collector AS uuid) 
                WHERE collector IS NOT NULL 
                  AND collector ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            ");

            // Step 3: Drop old text columns
            migrationBuilder.DropColumn(
                name: "destination",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "collector",
                table: "payments");

            // Step 4: Make destination_id NOT NULL (since it's required)
            migrationBuilder.AlterColumn<Guid>(
                name: "destination_id",
                table: "payments",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Add back text columns
            migrationBuilder.AddColumn<string>(
                name: "destination",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "collector",
                table: "payments",
                type: "text",
                nullable: true);

            // Copy UUID data back to text
            migrationBuilder.Sql(@"
                UPDATE payments 
                SET destination = destination_id::text 
                WHERE destination_id IS NOT NULL;
            ");

            migrationBuilder.Sql(@"
                UPDATE payments 
                SET collector = collector_id::text 
                WHERE collector_id IS NOT NULL;
            ");

            // Drop UUID columns
            migrationBuilder.DropColumn(
                name: "destination_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "collector_id",
                table: "payments");

            // Make destination NOT NULL
            migrationBuilder.AlterColumn<string>(
                name: "destination",
                table: "payments",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
