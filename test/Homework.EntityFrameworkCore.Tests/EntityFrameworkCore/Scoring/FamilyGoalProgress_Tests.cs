using System;
using System.Threading.Tasks;
using Homework.Scoring;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Scoring;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class FamilyGoalProgress_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly FamilyGoalProgressService _service;
    private readonly IRepository<DailyScore, Guid> _dailyScoreRepository;
    private readonly IGuidGenerator _guidGenerator;

    private static readonly DateOnly Start = new(2026, 7, 6);
    private static readonly DateOnly End = new(2026, 7, 12);

    public FamilyGoalProgress_Tests()
    {
        _service = GetRequiredService<FamilyGoalProgressService>();
        _dailyScoreRepository = GetRequiredService<IRepository<DailyScore, Guid>>();
        _guidGenerator = GetRequiredService<IGuidGenerator>();
    }

    [Fact]
    public async Task Progress_Sums_Both_Childrens_Stars_Within_Range_Only()
    {
        var gege = _guidGenerator.Create();
        var didi = _guidGenerator.Create();

        await WithUnitOfWorkAsync(async () =>
        {
            // 区间内：哥哥 5 + 4，弟弟 3 → 合计 12
            await SeedScoreAsync(gege, new DateOnly(2026, 7, 6), stars: 5);
            await SeedScoreAsync(gege, new DateOnly(2026, 7, 7), stars: 4);
            await SeedScoreAsync(didi, new DateOnly(2026, 7, 8), stars: 3);
            // 区间外：不计入
            await SeedScoreAsync(gege, new DateOnly(2026, 7, 5), stars: 5);  // Start 前一天
            await SeedScoreAsync(didi, new DateOnly(2026, 7, 13), stars: 5); // End 后一天
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var goal = new FamilyGoal(_guidGenerator.Create(), Guid.NewGuid(), "暑假大目标", targetStars: 100, Start, End);
            var stars = await _service.CalculateStarsAsync(goal);
            stars.ShouldBe(12);
        });
    }

    [Fact]
    public async Task Reaching_Target_Marks_Achieved()
    {
        var gege = _guidGenerator.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            await SeedScoreAsync(gege, new DateOnly(2026, 7, 6), stars: 5);
            await SeedScoreAsync(gege, new DateOnly(2026, 7, 7), stars: 5);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var goal = new FamilyGoal(_guidGenerator.Create(), Guid.NewGuid(), "小目标", targetStars: 10, Start, End);
            var achieved = await _service.RefreshAchievementAsync(goal);
            achieved.ShouldBeTrue();
            goal.AchievedTime.ShouldNotBeNull();
        });
    }

    [Fact]
    public async Task Below_Target_Is_Not_Achieved()
    {
        var gege = _guidGenerator.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            await SeedScoreAsync(gege, new DateOnly(2026, 7, 6), stars: 3);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var goal = new FamilyGoal(_guidGenerator.Create(), Guid.NewGuid(), "大目标", targetStars: 10, Start, End);
            var achieved = await _service.RefreshAchievementAsync(goal);
            achieved.ShouldBeFalse();
            goal.AchievedTime.ShouldBeNull();
        });
    }

    // 用 Settle(5, stars) 造出恰好 `stars` 颗星的一天（ceil(stars/5*5)=stars）。
    private async Task SeedScoreAsync(Guid childId, DateOnly date, int stars)
    {
        var score = new DailyScore(_guidGenerator.Create(), childId, date);
        score.Settle(5, stars);
        await _dailyScoreRepository.InsertAsync(score);
    }
}
