using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Donaciones.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToDonor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "donors",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UserId",
                table: "donors");
        }
    }
}
