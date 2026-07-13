using System;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Data;
using Shouldly;
using Volo.Abp.Data;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class CatalogSampleDataSeed_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly CatalogSampleDataSeedContributor _seeder;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IRepository<Medal, Guid> _medalRepo;

    public CatalogSampleDataSeed_Tests()
    {
        _seeder = GetRequiredService<CatalogSampleDataSeedContributor>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
        _medalRepo = GetRequiredService<IRepository<Medal, Guid>>();
    }

    [Fact]
    public async Task Seeds_Active_Rewards_And_Medals_Idempotently()
    {
        await WithUnitOfWorkAsync(() => _seeder.SeedAsync(new DataSeedContext()));

        long rewardCount = 0, medalCount = 0;
        await WithUnitOfWorkAsync(async () =>
        {
            rewardCount = await _rewardRepo.GetCountAsync();
            medalCount = await _medalRepo.GetCountAsync();
        });
        rewardCount.ShouldBeGreaterThanOrEqualTo(5);
        medalCount.ShouldBeGreaterThanOrEqualTo(3);

        // 再次运行不得重复插入
        await WithUnitOfWorkAsync(() => _seeder.SeedAsync(new DataSeedContext()));
        long rewardCount2 = 0, medalCount2 = 0;
        await WithUnitOfWorkAsync(async () =>
        {
            rewardCount2 = await _rewardRepo.GetCountAsync();
            medalCount2 = await _medalRepo.GetCountAsync();
        });
        rewardCount2.ShouldBe(rewardCount);
        medalCount2.ShouldBe(medalCount);
    }

    [Fact]
    public async Task Seeded_Rewards_Are_Active_With_Glyph()
    {
        await WithUnitOfWorkAsync(() => _seeder.SeedAsync(new DataSeedContext()));
        await WithUnitOfWorkAsync(async () =>
        {
            var items = await _rewardRepo.GetListAsync();
            items.ShouldAllBe(i => i.IsActive);
            items.ShouldContain(i => i.Glyph != null);
        });
    }
}
