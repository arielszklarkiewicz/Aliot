using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Donaciones.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "payments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "donors",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "donors",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "donations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "donations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "destinations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "destinations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "concepts",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "concepts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "collectors",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "collectors",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "created_by",
                table: "users");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "users");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "donors");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "donors");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "donations");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "donations");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "destinations");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "destinations");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "concepts");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "concepts");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "collectors");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "collectors");
        }
    }
}
