using Homework.Children;
using Homework.Children.Dtos;
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
public partial class WeeklyTaskTemplateItemMapper : MapperBase<WeeklyTaskTemplateItem, WeeklyTaskTemplateItemDto>
{
    public override partial WeeklyTaskTemplateItemDto Map(WeeklyTaskTemplateItem source);
    public override partial void Map(WeeklyTaskTemplateItem source, WeeklyTaskTemplateItemDto destination);
}
