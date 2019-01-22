ALL: package install
.PHONY: prepare-stack deploy-stack deploy-site

AWS_PROFILE ?= default
AWS_DEFAULT_REGION ?= eu-west-1

PACKAGE_TEMPLATE := template.yml
PACKAGE_BUCKET ?= fquffio-sources

SITE_HOSTNAME ?= pointers-arena.accrocch.io
DISTRIBUTION_ID := $(shell aws cloudfront list-distributions --query "DistributionList.Items[?contains(Aliases.Items, '$(SITE_HOSTNAME)')].Id" --output text)

FUNCTIONS := ddb-update on-connect on-disconnect on-list on-move

install:
	$(foreach dir, $(FUNCTIONS), yarn --cwd $(dir) install;)

clean:
	$(foreach dir, $(FUNCTIONS), rm -rf $(dir)/node_modules;)

package: clean
	aws cloudformation package \
		--template-file templates/root.yml \
		--output-template-file $(PACKAGE_TEMPLATE) \
		--s3-bucket $(PACKAGE_BUCKET) \
		--s3-prefix $(shell basename $$(pwd))

build:
	yarn install
	yarn run build

deploy: build
	aws s3 sync public s3://$(SITE_HOSTNAME) --delete
	aws cloudfront create-invalidation --paths '/*' --distribution-id $(DISTRIBUTION_ID)
