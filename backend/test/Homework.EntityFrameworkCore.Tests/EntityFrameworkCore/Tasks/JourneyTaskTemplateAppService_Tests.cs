using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Journeys;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class JourneyTaskTemplateAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IJourneyTaskTemplateAppService _service;
    private readonly IRepository<SharedJourney, Guid> _sharedJourneyRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public JourneyTaskTemplateAppService_Tests()
    {
        _service = GetRequiredService<IJourneyTaskTemplateAppService>();
        _sharedJourneyRepo = GetRequiredService<IRepository<SharedJourney, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(
        new[] { new Claim(AbpClaimTypes.UserId, id.ToString()) }, "test"));

    // 模板现在挂在 SharedJourney 上，归属校验走 SharedJourneyManager.GetOwnedAsync（按 ParentId）。
    private async Task<Guid> SeedSharedJourneyAsync(Guid parentId)
    {
        var sj = JourneyTestFactory.NewSharedJourney(parentId);
        await WithUnitOfWorkAsync(async () => await _sharedJourneyRepo.InsertAsync(sj, autoSave: true));
        return sj.Id;
    }

    [Fact]
    public async Task Create_List_Update_Delete_With_Reward_Config()
    {
        var pid = _guid.Create();
        var sharedJourneyId = await SeedSharedJourneyAsync(pid);
        var rewardItemId = _guid.Create();

        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(new CreateJourneyTaskTemplateItemDto
            {
                SharedJourneyId = sharedJourneyId, DayOfWeek = DayOfWeek.Monday, Title = "口算", Order = 0,
                RewardItemId = rewardItemId, RewardIsRandom = false
            });
            created.RewardIsRandom.ShouldBeFalse();
            created.RewardItemId.ShouldBe(rewardItemId);

            var list = await _service.GetListAsync(new GetJourneyTemplateInput { SharedJourneyId = sharedJourneyId });
            list.Items.Count.ShouldBe(1);

            var updated = await _service.UpdateAsync(created.Id, new UpdateJourneyTaskTemplateItemDto
            {
                Title = "口算20分钟", Order = 0, IsActive = false, RewardItemId = null, RewardIsRandom = true
            });
            updated.Title.ShouldBe("口算20分钟");
            updated.IsActive.ShouldBeFalse();
            updated.RewardIsRandom.ShouldBeTrue();
            updated.RewardItemId.ShouldBeNull();

            await _service.DeleteAsync(created.Id);
            (await _service.GetListAsync(new GetJourneyTemplateInput { SharedJourneyId = sharedJourneyId })).Items.Count.ShouldBe(0);
        }
    }
}
