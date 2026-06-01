package worker

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/config"
	"github.com/2mes4/argos-wallet/platform/internal/database"
)

type Job interface {
	Name() string
	Run(ctx context.Context) error
}

type Scheduler struct {
	db    *database.DB
	cfg   *config.WorkerConfig
	jobs  map[string]jobEntry
	quit  chan struct{}
}

type jobEntry struct {
	job     Job
	ticker  *time.Ticker
}

func NewScheduler(db *database.DB, cfg *config.WorkerConfig) *Scheduler {
	return &Scheduler{
		db:   db,
		cfg:  cfg,
		jobs: make(map[string]jobEntry),
		quit: make(chan struct{}),
	}
}

func (s *Scheduler) Register(name string, job Job, interval time.Duration) {
	s.jobs[name] = jobEntry{
		job:    job,
		ticker: time.NewTicker(interval),
	}
}

func (s *Scheduler) Start(ctx context.Context) {
	for name, entry := range s.jobs {
		go func(n string, e jobEntry) {
			log.Info().Str("job", n).Msg("job started")
			for {
				select {
				case <-e.ticker.C:
					if err := e.job.Run(ctx); err != nil {
						log.Error().Err(err).Str("job", n).Msg("job failed")
					}
				case <-s.quit:
					e.ticker.Stop()
					return
				}
			}
		}(name, entry)
	}
}

func (s *Scheduler) Stop() {
	close(s.quit)
}
