import { Helmet } from "react-helmet-async";
import { SITE_URL, type PageSEO } from "../config/seo";

interface SEOProps extends PageSEO {
  /** Set to true for dashboard/admin to avoid indexing. */
  noIndex?: boolean;
}

export function SEO({
  title,
  description,
  path = "/",
  image,
  keywords,
  noIndex = false,
}: SEOProps) {
  const canonical = path.startsWith("http") ? path : `${SITE_URL}${path}`;
  const ogImage = image?.startsWith("http") ? image : `${SITE_URL}${image || "/favicon.png"}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="MentorsDaily" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
}
