using System;
using System.Collections.Generic;
using System.Linq;
using Volo.Abp.DependencyInjection;

namespace Homework.Tasks;

/// <summary>加权随机选择（抽象出来便于测试替身）。</summary>
public interface IRandomPicker
{
    /// <summary>按权重选一个下标；总权重 &lt;=0 时返回 0。</summary>
    int PickWeighted(IReadOnlyList<int> weights);
}

public class DefaultRandomPicker : IRandomPicker, ITransientDependency
{
    public int PickWeighted(IReadOnlyList<int> weights)
    {
        var total = weights.Sum();
        if (total <= 0)
        {
            return 0;
        }

        var roll = Random.Shared.Next(total);
        var acc = 0;
        for (var i = 0; i < weights.Count; i++)
        {
            acc += weights[i];
            if (roll < acc)
            {
                return i;
            }
        }

        return weights.Count - 1;
    }
}
