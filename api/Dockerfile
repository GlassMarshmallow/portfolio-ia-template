FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY PortfolioApi.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
# Carpeta de las solicitudes recibidas (volumen); la crea root y se la da al usuario sin privilegios
RUN mkdir -p /data/solicitudes && chown $APP_UID /data/solicitudes
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "PortfolioApi.dll"]
