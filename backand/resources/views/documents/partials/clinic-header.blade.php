<div class="clinic-header">
    @if(!empty($branding['logo']))
        <img src="{{ $branding['logo'] }}" alt="{{ $branding['name'] }}" class="clinic-logo">
    @endif
    <div class="clinic-info">
        <h1>{{ $branding['name'] }}</h1>
        @if(!empty($branding['address']))
            <p>{{ $branding['address'] }}</p>
        @endif
        <p>
            @if(!empty($branding['phone']))
                <strong>Tel:</strong> {{ $branding['phone'] }}
            @endif
            @if(!empty($branding['email']))
                @if(!empty($branding['phone'])) &middot; @endif
                <strong>Email:</strong> {{ $branding['email'] }}
            @endif
        </p>
        @if(!empty($branding['website']))
            <p><strong>Web:</strong> {{ $branding['website'] }}</p>
        @endif
    </div>
</div>
