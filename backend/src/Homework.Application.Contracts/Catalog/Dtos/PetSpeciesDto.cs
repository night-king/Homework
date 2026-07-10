using System;
using System.Collections.Generic;
using Volo.Abp.Application.Dtos;

namespace Homework.Catalog.Dtos;

public class PetSpeciesDto : EntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
    public string? AccentColor { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public int DisplayOrder { get; set; }
    public List<PetFormDto> Forms { get; set; } = new();
}
