using Volo.Abp.Modularity;

namespace Homework;

public abstract class HomeworkApplicationTestBase<TStartupModule> : HomeworkTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
