using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Scoring;
using Homework.Scoring.Dtos;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Scoring;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class FamilyGoalAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IFamilyGoalAppService _service;
    private readonly IRepository<DailyScore, Guid> _scoreRepository;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    private static readonly DateOnly Start = new(2026, 7, 6);
    private static readonly DateOnly End = new(2026, 7, 12);

    public FamilyGoalAppService_Tests()
    {
        _service = GetRequiredService<IFamilyGoalAppService>();
        _scoreRepository = GetRequiredService<IRepository<DailyScore, Guid>>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(new[]
    {
        new Claim(AbpClaimTypes.UserId, id.ToString())
    }, "test"));

    private Task SeedScoreAsync(Guid childId, DateOnly date, int stars) => WithUnitOfWorkAsync(async () =>
    {
        var s = new DailyScore(_guid.Create(), childId, date);
        s.Settle(5, stars);
        await _scoreRepository.InsertAsync(s);
    });

    [Fact]
    public async Task Create_Then_Get_Roundtrips_Fields()
    {
        var pid = _guid.Create();
        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(new() { Title = "暑假大目标", TargetStars = 100, StartDate = Start, EndDate = End, RewardText = "看电影" });
            var got = await _service.GetAsync(created.Id);
            got.Title.ShouldBe("暑假大目标");
            got.TargetStars.ShouldBe(100);
            got.RewardText.ShouldBe("看电影");
        }
    }

    [Fact]
    public async Task Progress_Sums_Stars_In_Range_And_Marks_Achieved()
    {
        var pid = _guid.Create();
        var gege = _guid.Create();
        var didi = _guid.Create();

        using (_principal.Change(Parent(pid)))
        {
            await WithUnitOfWorkAsync(async () =>
            {
                await _childRepo.InsertAsync(new ChildProfile(gege, pid, "娃", 3));
                await _childRepo.InsertAsync(new ChildProfile(didi, pid, "娃", 3));
            });
            await SeedScoreAsync(gege, new DateOnly(2026, 7, 6), 5);
            await SeedScoreAsync(didi, new DateOnly(2026, 7, 7), 5);
            await SeedScoreAsync(gege, new DateOnly(2026, 7, 5), 5); // out of range, excluded

            var goal = await _service.CreateAsync(new() { Title = "小目标", TargetStars = 10, StartDate = Start, EndDate = End });
            var got = await _service.GetAsync(goal.Id);

            got.CurrentStars.ShouldBe(10);
            got.IsAchieved.ShouldBeTrue();
            got.ProgressPercent.ShouldBe(100);
        }
    }

    [Fact]
    public async Task Create_With_End_Before_Start_Throws()
    {
        var pid = _guid.Create();
        using (_principal.Change(Parent(pid)))
        {
            await Should.ThrowAsync<ArgumentException>(async () =>
                await _service.CreateAsync(new() { Title = "坏", TargetStars = 10, StartDate = End, EndDate = Start }));
        }
    }

    [Fact]
    public async Task Delete_Removes_Goal()
    {
        var pid = _guid.Create();
        using (_principal.Change(Parent(pid)))
        {
            var goal = await _service.CreateAsync(new() { Title = "删", TargetStars = 10, StartDate = Start, EndDate = End });
            await _service.DeleteAsync(goal.Id);
            await Should.ThrowAsync<Volo.Abp.Domain.Entities.EntityNotFoundException>(async () => await _service.GetAsync(goal.Id));
        }
    }
}
