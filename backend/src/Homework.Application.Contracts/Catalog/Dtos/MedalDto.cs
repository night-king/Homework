using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Catalog.Dtos;

public class MedalDto : EntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; }
    public int DisplayOrder { get; set; }
}
