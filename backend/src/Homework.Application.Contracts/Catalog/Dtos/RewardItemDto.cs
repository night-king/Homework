using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Catalog.Dtos;

public class RewardItemDto : EntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string? IconUrl { get; set; }      // 由 IAssetUrlResolver 计算
    public string? Glyph { get; set; }
    public int GrowthValue { get; set; }
    public int RandomWeight { get; set; }
    public bool IsActive { get; set; }
    public int DisplayOrder { get; set; }
}
