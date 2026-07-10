using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Microsoft.Extensions.Logging;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Homework.Tasks;

/// <summary>为每日任务解析实际奖励道具：指定优先，否则在启用道具上加权随机；空池返回 null。</summary>
public class RewardResolver : DomainService
{
    private readonly IRepository<RewardItem, Guid> _rewardRepository;
    private readonly IRandomPicker _picker;

    public RewardResolver(IRepository<RewardItem, Guid> rewardRepository, IRandomPicker picker)
    {
        _rewardRepository = rewardRepository;
        _picker = picker;
    }

    public async Task<Guid?> ResolveAsync(Guid? specificRewardItemId, bool isRandom)
    {
        if (!isRandom)
        {
            return specificRewardItemId;
        }

        var items = await _rewardRepository.GetListAsync(x => x.IsActive);
        if (items.Count == 0)
        {
            Logger.LogWarning("RewardResolver: no active RewardItem to draw from; task gets no reward.");
            return null;
        }

        var ordered = items.OrderBy(x => x.Id).ToList();
        var index = _picker.PickWeighted(ordered.Select(x => Math.Max(0, x.RandomWeight)).ToList());
        return ordered[index].Id;
    }
}
