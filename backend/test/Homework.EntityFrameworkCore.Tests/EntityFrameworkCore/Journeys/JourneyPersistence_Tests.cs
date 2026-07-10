using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Journeys;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Journeys;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class JourneyPersistence_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IRepository<Journey, Guid> _repo;
    private readonly IGuidGenerator _guid;

    public JourneyPersistence_Tests()
    {
        _repo = GetRequiredService<IRepository<Journey, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

    [Fact]
    public async Task Persists_And_Reloads_Journey_With_Stages_And_Backpack()
    {
        var now = new DateTime(2026, 7, 10, 0, 0, 0, DateTimeKind.Utc);
        var id = _guid.Create();
        var item = _guid.Create();

        await WithUnitOfWorkAsync(async () =>
        {
            var j = new Journey(id, _guid.Create(), _guid.Create(), "旅程",
                new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), _guid.Create());
            j.Start(_guid.Create(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
            j.GrantReward(item);
            j.Feed(item, 12, now); // growth 12, no evolve
            await _repo.InsertAsync(j, autoSave: true);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var q = await _repo.WithDetailsAsync(x => x.Stages, x => x.Backpack);
            var j = q.Single(x => x.Id == id);
            j.Status.ShouldBe(JourneyStatus.Active);
            j.Stages.Count.ShouldBe(5);
            j.CurrentLevel.ShouldBe(1);
            j.GrowthPoints.ShouldBe(12);
            j.Backpack.ShouldBeEmpty(); // fed the only item
        });
    }
}
