using System.Threading.Tasks;

namespace Homework.Data;

public interface IHomeworkDbSchemaMigrator
{
    Task MigrateAsync();
}
