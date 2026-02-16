using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Donaciones.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMessagesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    to_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    message_text = table.Column<string>(type: "text", nullable: false),
                    date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    is_read = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    replying_to = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_messages_messages_replying_to",
                        column: x => x.replying_to,
                        principalTable: "messages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_messages_users_from_user_id",
                        column: x => x.from_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_messages_users_to_user_id",
                        column: x => x.to_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_messages_date",
                table: "messages",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "IX_messages_from_user_id",
                table: "messages",
                column: "from_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_messages_is_read",
                table: "messages",
                column: "is_read");

            migrationBuilder.CreateIndex(
                name: "IX_messages_replying_to",
                table: "messages",
                column: "replying_to");

            migrationBuilder.CreateIndex(
                name: "IX_messages_to_user_id",
                table: "messages",
                column: "to_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "messages");
        }
    }
}
