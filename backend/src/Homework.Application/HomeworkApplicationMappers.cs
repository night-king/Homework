using Homework.Catalog;
using Homework.Catalog.Dtos;
using Homework.Children;
using Homework.Children.Dtos;
using Homework.Journeys;
using Homework.Journeys.Dtos;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Riok.Mapperly.Abstractions;
using Volo.Abp.Mapperly;

namespace Homework;

[Mapper]
public partial class ChildProfileMapper : MapperBase<ChildProfile, ChildProfileDto>
{
    [MapperIgnoreTarget(nameof(ChildProfileDto.HasPin))]
    public override partial ChildProfileDto Map(ChildProfile source);

    [MapperIgnoreTarget(nameof(ChildProfileDto.HasPin))]
    public override partial void Map(ChildProfile source, ChildProfileDto destination);
}

[Mapper]
public partial class DailyTaskMapper : MapperBase<DailyTask, DailyTaskDto>
{
    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardName))]
    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardGlyph))]
    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardIconUrl))]
    public override partial DailyTaskDto Map(DailyTask source);

    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardName))]
    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardGlyph))]
    [MapperIgnoreTarget(nameof(DailyTaskDto.RewardIconUrl))]
    public override partial void Map(DailyTask source, DailyTaskDto destination);
}

[Mapper]
public partial class RewardItemMapper : MapperBase<RewardItem, RewardItemDto>
{
    [MapperIgnoreTarget(nameof(RewardItemDto.IconUrl))]
    public override partial RewardItemDto Map(RewardItem source);

    [MapperIgnoreTarget(nameof(RewardItemDto.IconUrl))]
    public override partial void Map(RewardItem source, RewardItemDto destination);
}

[Mapper]
public partial class MedalMapper : MapperBase<Medal, MedalDto>
{
    [MapperIgnoreTarget(nameof(MedalDto.ImageUrl))]
    public override partial MedalDto Map(Medal source);

    [MapperIgnoreTarget(nameof(MedalDto.ImageUrl))]
    public override partial void Map(Medal source, MedalDto destination);
}

[Mapper]
public partial class PetSpeciesMapper : MapperBase<PetSpecies, PetSpeciesDto>
{
    [MapperIgnoreTarget(nameof(PetSpeciesDto.CoverUrl))]
    [MapperIgnoreTarget(nameof(PetSpeciesDto.Forms))]
    public override partial PetSpeciesDto Map(PetSpecies source);

    [MapperIgnoreTarget(nameof(PetSpeciesDto.CoverUrl))]
    [MapperIgnoreTarget(nameof(PetSpeciesDto.Forms))]
    public override partial void Map(PetSpecies source, PetSpeciesDto destination);
}

[Mapper]
public partial class JourneyTaskTemplateItemMapper : MapperBase<JourneyTaskTemplateItem, JourneyTaskTemplateItemDto>
{
    public override partial JourneyTaskTemplateItemDto Map(JourneyTaskTemplateItem source);
    public override partial void Map(JourneyTaskTemplateItem source, JourneyTaskTemplateItemDto destination);
}

[Mapper]
public partial class JourneyMapper : MapperBase<Journey, JourneyDto>
{
    public override partial JourneyDto Map(Journey source);
    public override partial void Map(Journey source, JourneyDto destination);
}
