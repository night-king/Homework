using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Homework.Migrations
{
    /// <inheritdoc />
    public partial class Added_FamilyGoal_ParentId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppChildProfiles_IdentityUserId",
                table: "AppChildProfiles");

            migrationBuilder.RenameColumn(
                name: "IdentityUserId",
                table: "AppChildProfiles",
                newName: "ParentId");

            migrationBuilder.AddColumn<Guid>(
                name: "ParentId",
                table: "AppFamilyGoals",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_AppChildProfiles_ParentId",
                table: "AppChildProfiles",
                column: "ParentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppChildProfiles_ParentId",
                table: "AppChildProfiles");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "AppFamilyGoals");

            migrationBuilder.RenameColumn(
                name: "ParentId",
                table: "AppChildProfiles",
                newName: "IdentityUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AppChildProfiles_IdentityUserId",
                table: "AppChildProfiles",
                column: "IdentityUserId",
                unique: true);
        }
    }
}
