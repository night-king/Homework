using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Children;
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
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public JourneyTaskTemplateAppService_Tests()
    {
        _service = GetRequiredService<IJourneyTaskTemplateAppService>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(
        new[] { new Claim(AbpClaimTypes.UserId, id.ToString()) }, "test"));

    private async Task<Guid> SeedJourneyAsync(Guid parentId, Guid childId)
    {
        var journeyId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            await _childRepo.InsertAsync(new ChildProfile(childId, parentId, "娃", 3));
            await _journeyRepo.InsertAsync(new Journey(journeyId, parentId, childId, "旅程",
                new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), _guid.Create()));
        });
        return journeyId;
    }

    [Fact]
    public async Task Create_List_Update_Delete_With_Reward_Config()
    {
        var pid = _guid.Create();
        var childId = _guid.Create();
        var journeyId = await SeedJourneyAsync(pid, childId);
        var rewardItemId = _guid.Create();

        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(new CreateJourneyTaskTemplateItemDto
            {
                JourneyId = journeyId, DayOfWeek = DayOfWeek.Monday, Title = "口算", Order = 0,
                RewardItemId = rewardItemId, RewardIsRandom = false
            });
            created.RewardIsRandom.ShouldBeFalse();
            created.RewardItemId.ShouldBe(rewardItemId);

            var list = await _service.GetListAsync(new GetJourneyTemplateInput { JourneyId = journeyId });
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
            (await _service.GetListAsync(new GetJourneyTemplateInput { JourneyId = journeyId })).Items.Count.ShouldBe(0);
        }
    }
}
