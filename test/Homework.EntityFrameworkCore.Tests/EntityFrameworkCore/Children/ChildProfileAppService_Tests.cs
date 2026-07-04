using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Children.Dtos;
using Shouldly;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Children;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class ChildProfileAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IChildProfileAppService _service;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public ChildProfileAppService_Tests()
    {
        _service = GetRequiredService<IChildProfileAppService>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(new[]
    {
        new Claim(AbpClaimTypes.UserId, id.ToString())
    }, "test"));

    [Fact]
    public async Task Create_Then_List_Includes_It()
    {
        using (_principal.Change(Parent(_guid.Create())))
        {
            var created = await _service.CreateAsync(new() { DisplayName = "哥哥", Grade = 3 });
            var mine = (await _service.GetListAsync()).Items.SingleOrDefault(c => c.Id == created.Id);
            mine.ShouldNotBeNull();
            mine!.Grade.ShouldBe(3);
        }
    }

    [Fact]
    public async Task Update_Changes_Name_And_Grade()
    {
        using (_principal.Change(Parent(_guid.Create())))
        {
            var created = await _service.CreateAsync(new() { DisplayName = "哥哥", Grade = 3 });
            var updated = await _service.UpdateAsync(created.Id, new() { DisplayName = "大宝", Grade = 4 });
            updated.DisplayName.ShouldBe("大宝");
            updated.Grade.ShouldBe(4);
        }
    }

    [Fact]
    public async Task SetPin_Sets_Then_Clears()
    {
        using (_principal.Change(Parent(_guid.Create())))
        {
            var created = await _service.CreateAsync(new() { DisplayName = "弟弟", Grade = 1 });
            await _service.SetPinAsync(created.Id, new() { Pin = "1234" });
            (await _service.GetAsync(created.Id)).HasPin.ShouldBeTrue();
            await _service.SetPinAsync(created.Id, new() { Pin = null });
            (await _service.GetAsync(created.Id)).HasPin.ShouldBeFalse();
        }
    }

    [Fact]
    public async Task Delete_Removes_Own_Child()
    {
        using (_principal.Change(Parent(_guid.Create())))
        {
            var created = await _service.CreateAsync(new() { DisplayName = "删", Grade = 2 });
            await _service.DeleteAsync(created.Id);
            (await _service.GetListAsync()).Items.ShouldNotContain(c => c.Id == created.Id);
        }
    }

    [Fact]
    public async Task Cannot_See_Other_Parents_Child()
    {
        var pA = _guid.Create();
        var pB = _guid.Create();
        Guid childOfA;
        using (_principal.Change(Parent(pA)))
            childOfA = (await _service.CreateAsync(new() { DisplayName = "A娃", Grade = 1 })).Id;
        using (_principal.Change(Parent(pB)))
            await Should.ThrowAsync<EntityNotFoundException>(async () => await _service.GetAsync(childOfA));
    }
}
