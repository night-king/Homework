using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class WeeklyTaskTemplateAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IWeeklyTaskTemplateAppService _service;
    private readonly IGuidGenerator _guid;

    public WeeklyTaskTemplateAppService_Tests()
    {
        _service = GetRequiredService<IWeeklyTaskTemplateAppService>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

    [Fact]
    public async Task Create_Then_List_Returns_Item_Sorted()
    {
        var child = _guid.Create();
        await _service.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 1 });
        await _service.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "数学", Order = 0 });

        var list = await _service.GetListAsync(new() { ChildId = child });
        list.Items.Count.ShouldBe(2);
        list.Items.Select(i => i.Title).ShouldBe(new[] { "数学", "语文" }); // by Order
    }

    [Fact]
    public async Task List_Filters_By_DayOfWeek()
    {
        var child = _guid.Create();
        await _service.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "周一", Order = 0 });
        await _service.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Tuesday, Title = "周二", Order = 0 });

        var mon = await _service.GetListAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday });
        mon.Items.Count.ShouldBe(1);
        mon.Items[0].Title.ShouldBe("周一");
    }

    [Fact]
    public async Task Update_Changes_Title_And_IsActive()
    {
        var child = _guid.Create();
        var created = await _service.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "旧", Order = 0 });
        var updated = await _service.UpdateAsync(created.Id,
            new() { Title = "新", Order = 0, IsActive = false });
        updated.Title.ShouldBe("新");
        updated.IsActive.ShouldBeFalse();
    }

    [Fact]
    public async Task Delete_Removes_Item()
    {
        var child = _guid.Create();
        var created = await _service.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "删", Order = 0 });
        await _service.DeleteAsync(created.Id);
        (await _service.GetListAsync(new() { ChildId = child })).Items.Count.ShouldBe(0);
    }
}
