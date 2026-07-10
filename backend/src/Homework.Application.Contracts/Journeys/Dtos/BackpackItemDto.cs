using System;

namespace Homework.Journeys.Dtos;

public class BackpackItemDto
{
    public Guid RewardItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IconUrl { get; set; }
    public string? Glyph { get; set; }
    public int Quantity { get; set; }
    public int GrowthValue { get; set; }
}
