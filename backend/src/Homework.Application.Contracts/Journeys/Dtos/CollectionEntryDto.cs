using System;

namespace Homework.Journeys.Dtos;

public class CollectionEntryDto
{
    public Guid JourneyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public Guid PetSpeciesId { get; set; }
    public string PetName { get; set; } = string.Empty;
    public string? PetFinalSpriteUrl { get; set; }
    public Guid MedalId { get; set; }
    public string MedalName { get; set; } = string.Empty;
    public string? MedalImageUrl { get; set; }
    public DateTime CompletedTime { get; set; }
}
