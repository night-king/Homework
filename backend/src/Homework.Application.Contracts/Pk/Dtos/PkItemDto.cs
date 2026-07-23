using System;

namespace Homework.Pk.Dtos;

/// <summary>PK 卡片上的一件道具（背包奖励物）及其数量。</summary>
public class PkItemDto
{
    public Guid RewardItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Glyph { get; set; }
    public string? IconUrl { get; set; }
    public int Quantity { get; set; }
}
