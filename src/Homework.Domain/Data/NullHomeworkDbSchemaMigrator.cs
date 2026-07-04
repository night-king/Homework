using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace Homework.Data;

/* This is used if database provider does't define
 * IHomeworkDbSchemaMigrator implementation.
 */
public class NullHomeworkDbSchemaMigrator : IHomeworkDbSchemaMigrator, ITransientDependency
{
    public Task MigrateAsync()
    {
        return Task.CompletedTask;
    }
}
