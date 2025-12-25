using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Donaciones.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDeletionLogTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "deletion_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_type = table.Column<string>(type: "text", nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_details = table.Column<string>(type: "text", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_deletion_logs", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_deletion_logs_deleted_at",
                table: "deletion_logs",
                column: "deleted_at");

            migrationBuilder.CreateIndex(
                name: "IX_deletion_logs_entity_type",
                table: "deletion_logs",
                column: "entity_type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "deletion_logs");
        }
    }
}
