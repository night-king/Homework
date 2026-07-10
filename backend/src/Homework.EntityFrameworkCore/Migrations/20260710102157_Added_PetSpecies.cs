using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Homework.Migrations
{
    /// <inheritdoc />
    public partial class Added_PetSpecies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppPetSpecies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CoverObjectKey = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    AccentColor = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    Description = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_AppPetSpecies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppPetForms",
                columns: table => new
                {
                    PetSpeciesId = table.Column<Guid>(type: "uuid", nullable: false),
                    Level = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SpriteObjectKey = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    RevealText = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    GrowthToNext = table.Column<int>(type: "integer", nullable: true),
                    EvolveVideoObjectKey = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Scale = table.Column<decimal>(type: "numeric", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppPetForms", x => new { x.PetSpeciesId, x.Level });
                    table.ForeignKey(
                        name: "FK_AppPetForms_AppPetSpecies_PetSpeciesId",
                        column: x => x.PetSpeciesId,
                        principalTable: "AppPetSpecies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppPetSpecies_Code",
                table: "AppPetSpecies",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppPetSpecies_IsActive_DisplayOrder",
                table: "AppPetSpecies",
                columns: new[] { "IsActive", "DisplayOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppPetForms");

            migrationBuilder.DropTable(
                name: "AppPetSpecies");
        }
    }
}
