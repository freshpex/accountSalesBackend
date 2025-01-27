$projects = @(
    "prj_XXOyskvOWvMrFW9Dmev87xQPduRV",
    "prj_FjcNfrVChJsDNTVtLKqT8IoEVAxn"
)

foreach ($project in $projects) {
    Write-Host "Deploying to project $project..."
    Remove-Item -Recurse -Force .vercel -ErrorAction SilentlyContinue
    vercel link --project $project
    vercel --prod
}