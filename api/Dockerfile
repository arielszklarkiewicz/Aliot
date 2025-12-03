# Imagen base
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Copiar los csproj
COPY api/Donaciones.Api/Donaciones.Api.csproj api/Donaciones.Api/

# Restaurar
RUN dotnet restore api/Donaciones.Api/Donaciones.Api.csproj

# Copiar todo el código
COPY api/Donaciones.Api/ api/Donaciones.Api/

# Compilar
RUN dotnet publish api/Donaciones.Api/Donaciones.Api.csproj -c Release -o /app/publish

# Imagen final
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

WORKDIR /app
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Donaciones.Api.dll"]