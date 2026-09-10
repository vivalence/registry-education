export const audible = async (ctx, literal) => {
  const asset = literal?.trait?.VOCALIZED?.asset;
  if (!asset) return false;
  if (asset.path) return (await ctx.entities.file.findOne({ path: asset.path })) !== null;
  if (asset.slug) return (await ctx.entities.file.count({ path: { $like: `%${asset.slug}%` } })) > 0;
  return false;
};
