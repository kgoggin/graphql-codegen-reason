
FROM node:11.4

LABEL version="1.0.0"

LABEL com.github.actions.name="Buld and test"
LABEL com.github.actions.description="Builds and tests the project"
LABEL com.github.actions.icon="package"
LABEL com.github.actions.color="blue"

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]
CMD ["help"]
