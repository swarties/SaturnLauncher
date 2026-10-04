package fabric

import "context"

type Fabric struct {
	ctx context.Context
}

func NewFabric() *Fabric {
	return &Fabric{}
}

func (f *Fabric) GetLoaderVersions() {}
