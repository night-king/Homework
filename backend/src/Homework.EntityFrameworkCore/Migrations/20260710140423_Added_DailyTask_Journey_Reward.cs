using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Homework.Migrations
{
    /// <inheritdoc />
    public partial class Added_DailyTask_Journey_Reward : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "JourneyId",
                table: "AppDailyTasks",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<bool>(
                name: "RewardGranted",
                table: "AppDailyTasks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "RewardItemId",
                table: "AppDailyTasks",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppDailyTasks_JourneyId_Date",
                table: "AppDailyTasks",
                columns: new[] { "JourneyId", "Date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppDailyTasks_JourneyId_Date",
                table: "AppDailyTasks");

            migrationBuilder.DropColumn(
                name: "JourneyId",
                table: "AppDailyTasks");

            migrationBuilder.DropColumn(
                name: "RewardGranted",
                table: "AppDailyTasks");

            migrationBuilder.DropColumn(
                name: "RewardItemId",
                table: "AppDailyTasks");
        }
    }
}
