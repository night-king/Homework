using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Scoring;
using Homework.Tasks;
using Microsoft.EntityFrameworkCore;
using Volo.Abp.AuditLogging.EntityFrameworkCore;
using Volo.Abp.BackgroundJobs.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore.Modeling;
using Volo.Abp.FeatureManagement.EntityFrameworkCore;
using Volo.Abp.Identity;
using Volo.Abp.Identity.EntityFrameworkCore;
using Volo.Abp.OpenIddict.EntityFrameworkCore;
using Volo.Abp.PermissionManagement.EntityFrameworkCore;
using Volo.Abp.SettingManagement.EntityFrameworkCore;
using Volo.Abp.TenantManagement;
using Volo.Abp.TenantManagement.EntityFrameworkCore;

namespace Homework.EntityFrameworkCore;

[ReplaceDbContext(typeof(IIdentityDbContext))]
[ReplaceDbContext(typeof(ITenantManagementDbContext))]
[ConnectionStringName("Default")]
public class HomeworkDbContext :
    AbpDbContext<HomeworkDbContext>,
    IIdentityDbContext,
    ITenantManagementDbContext
{
    /* Add DbSet properties for your Aggregate Roots / Entities here. */

    // Homework game
    public DbSet<ChildProfile> ChildProfiles { get; set; }
    public DbSet<DailyTask> DailyTasks { get; set; }
    public DbSet<DailyScore> DailyScores { get; set; }
    public DbSet<RewardItem> RewardItems { get; set; }
    public DbSet<Medal> Medals { get; set; }
    public DbSet<PetSpecies> PetSpecies { get; set; }
    public DbSet<Journey> Journeys { get; set; }
    public DbSet<SharedJourney> SharedJourneys { get; set; }
    public DbSet<JourneyTaskTemplateItem> JourneyTaskTemplateItems { get; set; }

    #region Entities from the modules

    /* Notice: We only implemented IIdentityDbContext and ITenantManagementDbContext
     * and replaced them for this DbContext. This allows you to perform JOIN
     * queries for the entities of these modules over the repositories easily. You
     * typically don't need that for other modules. But, if you need, you can
     * implement the DbContext interface of the needed module and use ReplaceDbContext
     * attribute just like IIdentityDbContext and ITenantManagementDbContext.
     *
     * More info: Replacing a DbContext of a module ensures that the related module
     * uses this DbContext on runtime. Otherwise, it will use its own DbContext class.
     */

    //Identity
    public DbSet<IdentityUser> Users { get; set; }
    public DbSet<IdentityRole> Roles { get; set; }
    public DbSet<IdentityClaimType> ClaimTypes { get; set; }
    public DbSet<OrganizationUnit> OrganizationUnits { get; set; }
    public DbSet<IdentitySecurityLog> SecurityLogs { get; set; }
    public DbSet<IdentityLinkUser> LinkUsers { get; set; }
    public DbSet<IdentityUserDelegation> UserDelegations { get; set; }
    public DbSet<IdentitySession> Sessions { get; set; }
    // Tenant Management
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<TenantConnectionString> TenantConnectionStrings { get; set; }

    #endregion

    public HomeworkDbContext(DbContextOptions<HomeworkDbContext> options)
        : base(options)
    {

    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        /* Include modules to your migration db context */

        builder.ConfigurePermissionManagement();
        builder.ConfigureSettingManagement();
        builder.ConfigureBackgroundJobs();
        builder.ConfigureAuditLogging();
        builder.ConfigureIdentity();
        builder.ConfigureOpenIddict();
        builder.ConfigureFeatureManagement();
        builder.ConfigureTenantManagement();

        /* Configure your own tables/entities inside here */

        builder.Entity<ChildProfile>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "ChildProfiles", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.DisplayName).IsRequired().HasMaxLength(32);
            b.Property(x => x.AvatarKey).HasMaxLength(64);
            b.Property(x => x.Pin).HasMaxLength(8);
            b.HasIndex(x => x.ParentId);
        });

        builder.Entity<DailyTask>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "DailyTasks", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Title).IsRequired().HasMaxLength(128);
            b.Property(x => x.Subject).HasMaxLength(64);
            b.HasIndex(x => new { x.ChildId, x.Date });
            b.HasIndex(x => new { x.JourneyId, x.Date });
        });

        builder.Entity<DailyScore>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "DailyScores", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.HasIndex(x => new { x.ChildId, x.Date }).IsUnique();
        });

        builder.Entity<RewardItem>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "RewardItems", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(64);
            b.Property(x => x.IconObjectKey).HasMaxLength(256);
            b.Property(x => x.Glyph).HasMaxLength(8);
            b.HasIndex(x => new { x.IsActive, x.DisplayOrder });
        });

        builder.Entity<Medal>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "Medals", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(64);
            b.Property(x => x.Description).HasMaxLength(512);
            b.Property(x => x.ImageObjectKey).HasMaxLength(256);
            b.HasIndex(x => new { x.IsActive, x.DisplayOrder });
        });

        builder.Entity<PetSpecies>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "PetSpecies", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(64);
            b.Property(x => x.Code).IsRequired().HasMaxLength(64);
            b.Property(x => x.CoverObjectKey).HasMaxLength(256);
            b.Property(x => x.AccentColor).HasMaxLength(16);
            b.Property(x => x.Description).HasMaxLength(512);
            b.HasIndex(x => x.Code).IsUnique();
            b.HasIndex(x => new { x.IsActive, x.DisplayOrder });
            b.HasMany(x => x.Forms).WithOne()
                .HasForeignKey(f => f.PetSpeciesId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<PetForm>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "PetForms", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.HasKey(x => new { x.PetSpeciesId, x.Level });
            b.Property(x => x.Name).IsRequired().HasMaxLength(64);
            b.Property(x => x.SpriteObjectKey).HasMaxLength(256);
            b.Property(x => x.RevealText).HasMaxLength(128);
            b.Property(x => x.EvolveVideoObjectKey).HasMaxLength(256);
        });

        builder.Entity<Journey>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "Journeys", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Title).IsRequired().HasMaxLength(128);
            b.Property(x => x.Description).HasMaxLength(512);
            b.HasIndex(x => new { x.ChildId, x.Status });
            // 迁移期新增：域内始终有值；旧行由 Chunk 3 回填（列默认 Guid.Empty）。
            b.HasIndex(x => x.SharedJourneyId);
            b.HasMany(x => x.Stages).WithOne()
                .HasForeignKey(s => s.JourneyId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(x => x.Backpack).WithOne()
                .HasForeignKey(bp => bp.JourneyId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<SharedJourney>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "SharedJourneys", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Title).IsRequired().HasMaxLength(128);
            b.Property(x => x.Description).HasMaxLength(512);
            b.HasIndex(x => x.ParentId);
        });

        builder.Entity<JourneyPetStage>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "JourneyPetStages", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.HasKey(x => new { x.JourneyId, x.Level });
        });

        builder.Entity<JourneyBackpackItem>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "JourneyBackpackItems", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.HasKey(x => new { x.JourneyId, x.RewardItemId });
        });

        builder.Entity<JourneyTaskTemplateItem>(b =>
        {
            b.ToTable(HomeworkConsts.DbTablePrefix + "JourneyTaskTemplateItems", HomeworkConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Title).IsRequired().HasMaxLength(128);
            b.Property(x => x.Subject).HasMaxLength(64);
            // 模板改键：新增 SharedJourneyId，旧 JourneyId 列保留至 Chunk 6。
            b.HasIndex(x => new { x.JourneyId, x.DayOfWeek });
            b.HasIndex(x => new { x.SharedJourneyId, x.DayOfWeek });
        });
    }
}
