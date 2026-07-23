using System;
using System.Collections.Generic;

namespace Homework.Pk.Dtos;

/// <summary>本周 PK 榜上的一个孩子（已按名次排好，Rank 从 1 起）。</summary>
public class PkEntryDto
{
    public int Rank { get; set; }
    public Guid ChildId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarKey { get; set; }

    // 宠物（取该孩子当前 Active 旅程）
    public Guid PetSpeciesId { get; set; }
    public string PetName { get; set; } = string.Empty;
    public int PetLevel { get; set; }
    public string? PetSpriteUrl { get; set; }

    // 排名主键 + 展示
    public int CompletionPercent { get; set; }
    public int CompletedTasks { get; set; }
    public int TotalTasks { get; set; }

    // 并列兜底键（也可展示）
    public int Streak { get; set; }
    public int WeeklyStars { get; set; }

    public List<PkItemDto> Items { get; set; } = new();
}
