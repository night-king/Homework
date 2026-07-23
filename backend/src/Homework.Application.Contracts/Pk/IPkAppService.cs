using System.Threading.Tasks;
using Homework.Pk.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Pk;

public interface IPkAppService : IApplicationService
{
    /// <summary>本周 PK 榜：当前家长名下、正在跑旅程的孩子，按本周完成度排名。</summary>
    Task<WeeklyPkResultDto> GetWeeklyAsync();
}
