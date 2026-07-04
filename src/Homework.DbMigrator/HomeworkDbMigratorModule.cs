using Homework.EntityFrameworkCore;
using Volo.Abp.Autofac;
using Volo.Abp.Modularity;

namespace Homework.DbMigrator;

[DependsOn(
    typeof(AbpAutofacModule),
    typeof(HomeworkEntityFrameworkCoreModule),
    typeof(HomeworkApplicationContractsModule)
    )]
public class HomeworkDbMigratorModule : AbpModule
{
}
