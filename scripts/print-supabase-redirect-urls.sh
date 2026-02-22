#!/bin/sh
# Print Supabase redirect URLs for your Vercel deployment.
# Copy these into Supabase Dashboard → Authentication → URL Configuration.

echo ""
echo "=== Supabase URL Configuration ==="
echo ""
echo "Site URL (set as default redirect):"
echo "  https://taskforge-farhanjamil1000-7173s-projects.vercel.app"
echo ""
echo "Redirect URLs (add each to the allow list):"
echo "  https://taskforge-farhanjamil1000-7173s-projects.vercel.app/**"
echo "  https://taskforge-farhanjamil1000-7173s-projects.vercel.app/auth/callback"
echo "  https://*.vercel.app/**"
echo "  http://localhost:3000/**"
echo ""
echo "Dashboard: https://supabase.com/dashboard/project/_/auth/url-configuration"
echo ""
