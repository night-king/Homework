using Volo.Abp.Modularity;

namespace Homework;

/* Inherit from this class for your domain layer tests. */
public abstract class HomeworkDomainTestBase<TStartupModule> : HomeworkTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
