using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Homework.Migrations
{
    /// <inheritdoc />
    public partial class Reshaped_FamilyGoal_To_Journey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppFamilyGoals");

            migrationBuilder.DropColumn(
                name: "ActivePetId",
                table: "AppChildProfiles");

            migrationBuilder.CreateTable(
                name: "AppJourneys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChildId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Description = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MedalId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<byte>(type: "smallint", nullable: false),
                    PetSpeciesId = table.Column<Guid>(type: "uuid", nullable: true),
                    CurrentLevel = table.Column<int>(type: "integer", nullable: false),
                    GrowthPoints = table.Column<int>(type: "integer", nullable: false),
                    CompletedTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
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
                    table.PrimaryKey("PK_AppJourneys", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppJourneyBackpackItems",
                columns: table => new
                {
                    JourneyId = table.Column<Guid>(type: "uuid", nullable: false),
                    RewardItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppJourneyBackpackItems", x => new { x.JourneyId, x.RewardItemId });
                    table.ForeignKey(
                        name: "FK_AppJourneyBackpackItems_AppJourneys_JourneyId",
                        column: x => x.JourneyId,
                        principalTable: "AppJourneys",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AppJourneyPetStages",
                columns: table => new
                {
                    JourneyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Level = table.Column<int>(type: "integer", nullable: false),
                    GrowthToNext = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppJourneyPetStages", x => new { x.JourneyId, x.Level });
                    table.ForeignKey(
                        name: "FK_AppJourneyPetStages_AppJourneys_JourneyId",
                        column: x => x.JourneyId,
                        principalTable: "AppJourneys",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppJourneys_ChildId_Status",
                table: "AppJourneys",
                columns: new[] { "ChildId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppJourneyBackpackItems");

            migrationBuilder.DropTable(
                name: "AppJourneyPetStages");

            migrationBuilder.DropTable(
                name: "AppJourneys");

            migrationBuilder.AddColumn<Guid>(
                name: "ActivePetId",
                table: "AppChildProfiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AppFamilyGoals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AchievedTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeleterId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ExtraProperties = table.Column<string>(type: "text", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    LastModificationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uuid", nullable: true),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: false),
                    RewardText = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TargetStars = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppFamilyGoals", x => x.Id);
                });
        }
    }
}
