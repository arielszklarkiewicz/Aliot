using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Donaciones.Api.Migrations
{
    /// <inheritdoc />
    public partial class ConvertDonationConceptDestinationToGuid : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Add new UUID columns (nullable initially to allow data migration)
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='donations' AND column_name='concept_id') THEN
                        ALTER TABLE donations ADD concept_id uuid;
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='donations' AND column_name='destination_id') THEN
                        ALTER TABLE donations ADD destination_id uuid;
                    END IF;
                END $$;
            ");

            // Step 2: Copy data from text columns to UUID columns
            // Convert concept text to UUID (assumes the text column contains UUIDs as strings)
            migrationBuilder.Sql(@"
                UPDATE donations 
                SET concept_id = CAST(concept AS uuid) 
                WHERE concept IS NOT NULL 
                  AND concept ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            ");

            // Convert destination text to UUID (assumes the text column contains UUIDs as strings)
            migrationBuilder.Sql(@"
                UPDATE donations 
                SET destination_id = CAST(destination AS uuid) 
                WHERE destination IS NOT NULL 
                  AND destination ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            ");

            // Step 3: Drop old text columns
            migrationBuilder.DropColumn(
                name: "concept",
                table: "donations");

            migrationBuilder.DropColumn(
                name: "destination",
                table: "donations");

            // Step 4: Make concept_id and destination_id NOT NULL (only if there are no NULL values)
            // For safety, set a default GUID for any NULL values before making NOT NULL
            migrationBuilder.Sql(@"
                UPDATE donations 
                SET concept_id = '00000000-0000-0000-0000-000000000000'::uuid
                WHERE concept_id IS NULL;
            ");
            
            migrationBuilder.Sql(@"
                UPDATE donations 
                SET destination_id = '00000000-0000-0000-0000-000000000000'::uuid
                WHERE destination_id IS NULL;
            ");
            
            migrationBuilder.AlterColumn<Guid>(
                name: "concept_id",
                table: "donations",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "destination_id",
                table: "donations",
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
                name: "concept",
                table: "donations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "destination",
                table: "donations",
                type: "text",
                nullable: true);

            // Copy UUID data back to text
            migrationBuilder.Sql(@"
                UPDATE donations 
                SET concept = concept_id::text 
                WHERE concept_id IS NOT NULL;
            ");

            migrationBuilder.Sql(@"
                UPDATE donations 
                SET destination = destination_id::text 
                WHERE destination_id IS NOT NULL;
            ");

            // Drop UUID columns
            migrationBuilder.DropColumn(
                name: "concept_id",
                table: "donations");

            migrationBuilder.DropColumn(
                name: "destination_id",
                table: "donations");

            // Make concept and destination NOT NULL
            migrationBuilder.AlterColumn<string>(
                name: "concept",
                table: "donations",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "destination",
                table: "donations",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}

