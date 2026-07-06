using Volo.Abp.Modularity;

namespace Homework;

[DependsOn(
    typeof(HomeworkApplicationModule),
    typeof(HomeworkDomainTestModule)
)]
public class HomeworkApplicationTestModule : AbpModule
{

}
