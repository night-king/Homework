using Volo.Abp.Modularity;

namespace Homework;

[DependsOn(
    typeof(HomeworkDomainModule),
    typeof(HomeworkTestBaseModule)
)]
public class HomeworkDomainTestModule : AbpModule
{

}
