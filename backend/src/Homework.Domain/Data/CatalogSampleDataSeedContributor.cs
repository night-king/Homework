using System;
using System.Threading.Tasks;
using Homework.Catalog;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;

namespace Homework.Data;

/// <summary>
/// 开发数据种子:仅当图鉴为空时插入样例奖励道具 + 勋章(幂等,可重复运行)。
/// 让家长「创建旅程」向导在无图鉴管理后台(Slice C)时也能立即选择道具/勋章。
/// 因「仅空表才插」,上线后不会覆盖真实图鉴数据。
/// </summary>
public class CatalogSampleDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IRepository<RewardItem, Guid> _rewardRepository;
    private readonly IRepository<Medal, Guid> _medalRepository;
    private readonly IGuidGenerator _guidGenerator;

    public CatalogSampleDataSeedContributor(
        IRepository<RewardItem, Guid> rewardRepository,
        IRepository<Medal, Guid> medalRepository,
        IGuidGenerator guidGenerator)
    {
        _rewardRepository = rewardRepository;
        _medalRepository = medalRepository;
        _guidGenerator = guidGenerator;
    }

    public async Task SeedAsync(DataSeedContext context)
    {
        await SeedRewardItemsAsync();
        await SeedMedalsAsync();
    }

    private async Task SeedRewardItemsAsync()
    {
        if (await _rewardRepository.GetCountAsync() > 0)
        {
            return;
        }

        var samples = new[]
        {
            ("星火书签", "✦", 12, 2),
            ("共鸣号角", "📯", 12, 2),
            ("留存果实", "🍎", 15, 3),
            ("能量宝石", "💎", 20, 1),
            ("速算金币", "🪙", 10, 3),
        };

        var order = 0;
        foreach (var (name, glyph, growth, weight) in samples)
        {
            var item = new RewardItem(_guidGenerator.Create(), name, growth, weight);
            item.SetGlyph(glyph);
            item.SetDisplayOrder(order++);
            item.Activate();
            await _rewardRepository.InsertAsync(item, autoSave: true);
        }
    }

    private async Task SeedMedalsAsync()
    {
        if (await _medalRepository.GetCountAsync() > 0)
        {
            return;
        }

        var samples = new[]
        {
            ("暑期毕业勋章", "完成整个暑假旅程的荣誉"),
            ("坚持之星", "连续坚持完成任务"),
            ("探索者徽章", "勇于尝试新挑战"),
        };

        var order = 0;
        foreach (var (name, desc) in samples)
        {
            var medal = new Medal(_guidGenerator.Create(), name);
            medal.SetDescription(desc);
            medal.SetDisplayOrder(order++);
            medal.Activate();
            await _medalRepository.InsertAsync(medal, autoSave: true);
        }
    }
}
