using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Homework.Migrations
{
    /// <inheritdoc />
    public partial class Added_SharedJourney : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SharedJourneyId",
                table: "AppJourneyTaskTemplateItems",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "SharedJourneyId",
                table: "AppJourneys",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "AppSharedJourneys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Description = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MedalId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<byte>(type: "smallint", nullable: false),
                    ExtraProperties = table.Column<string>(type: "text", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DeleterId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppSharedJourneys", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppJourneyTaskTemplateItems_SharedJourneyId_DayOfWeek",
                table: "AppJourneyTaskTemplateItems",
                columns: new[] { "SharedJourneyId", "DayOfWeek" });

            migrationBuilder.CreateIndex(
                name: "IX_AppJourneys_SharedJourneyId",
                table: "AppJourneys",
                column: "SharedJourneyId");

            migrationBuilder.CreateIndex(
                name: "IX_AppSharedJourneys_ParentId",
                table: "AppSharedJourneys",
                column: "ParentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppSharedJourneys");

            migrationBuilder.DropIndex(
                name: "IX_AppJourneyTaskTemplateItems_SharedJourneyId_DayOfWeek",
                table: "AppJourneyTaskTemplateItems");

            migrationBuilder.DropIndex(
                name: "IX_AppJourneys_SharedJourneyId",
                table: "AppJourneys");

            migrationBuilder.DropColumn(
                name: "SharedJourneyId",
                table: "AppJourneyTaskTemplateItems");

            migrationBuilder.DropColumn(
                name: "SharedJourneyId",
                table: "AppJourneys");
        }
    }
}
