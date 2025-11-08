import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getUserScanHistory } from "@/lib/supabaseStorage";
import {
  GitCompare,
  Loader2,
  LogIn,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileImage,
  Info,
} from "lucide-react";
import { format } from "date-fns";

interface ScanHistoryItem {
  id: string;
  created_at: string;
  image_url: string;
  file_name: string;
  file_size: number;
  tumor_detected: boolean;
  confidence: number;
  tumor_level: string;
  tumor_type: string | null;
  recommendations: string[];
  processing_time: number;
}

const Comparison = () => {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [selectedScans, setSelectedScans] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth");
      return;
    }

    if (isAuthenticated && user) {
      loadScanHistory();
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const loadScanHistory = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await getUserScanHistory(user.id, 20);

      if (error) {
        throw new Error(error);
      }

      setScans(data || []);
    } catch (error) {
      console.error("Failed to load scan history:", error);
      toast({
        title: "Failed to load scans",
        description: "Could not retrieve your scan history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleScanSelection = (scanId: string) => {
    setSelectedScans((prev) => {
      if (prev.includes(scanId)) {
        return prev.filter((id) => id !== scanId);
      } else if (prev.length < 4) {
        return [...prev, scanId];
      } else {
        toast({
          title: "Maximum scans selected",
          description: "You can compare up to 4 scans at a time",
          variant: "destructive",
        });
        return prev;
      }
    });
  };

  const selectedScanData = scans.filter((scan) =>
    selectedScans.includes(scan.id)
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center gap-3">
            <GitCompare className="h-10 w-10 text-primary" />
            Scan Comparison
          </h1>
          <p className="text-lg text-muted-foreground">
            Select up to 4 scans to compare side-by-side and track changes over
            time
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 border-primary bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            <strong>Tip:</strong> Select scans from different dates to track
            tumor progression or treatment effectiveness over time.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : scans.length === 0 ? (
          <Card className="p-12 text-center">
            <FileImage className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Scans Found
            </h3>
            <p className="text-muted-foreground mb-6">
              You don't have any saved scans yet. Upload and analyze scans to
              start comparing.
            </p>
            <Button
              onClick={() => navigate("/try-now")}
              className="bg-gradient-primary hover:shadow-medical"
            >
              Analyze First Scan
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Scan Selection */}
            {selectedScans.length === 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Select Scans to Compare
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scans.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => toggleScanSelection(scan.id)}
                    >
                      <Checkbox
                        checked={selectedScans.includes(scan.id)}
                        onCheckedChange={() => toggleScanSelection(scan.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">
                          {scan.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(scan.created_at), "MMM d, yyyy")}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {scan.tumor_detected ? (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Tumor Detected
                            </span>
                          ) : (
                            <span className="text-xs text-success flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              No Tumor
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {scan.confidence}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Comparison View */}
            {selectedScans.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">
                    Comparing {selectedScans.length} Scans
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedScans([])}
                  >
                    Change Selection
                  </Button>
                </div>

                <div
                  className={`grid gap-6 ${
                    selectedScans.length === 1
                      ? "grid-cols-1"
                      : selectedScans.length === 2
                      ? "grid-cols-1 lg:grid-cols-2"
                      : selectedScans.length === 3
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                  }`}
                >
                  {selectedScanData.map((scan) => (
                    <Card
                      key={scan.id}
                      className="p-6 bg-gradient-card border-0 shadow-card"
                    >
                      {/* Scan Image */}
                      <div className="relative rounded-lg overflow-hidden bg-muted/50 border mb-4">
                        <img
                          src={scan.image_url}
                          alt={scan.file_name}
                          className="w-full h-48 object-contain"
                        />
                      </div>

                      {/* Scan Info */}
                      <div className="space-y-4">
                        {/* Date */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(scan.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>

                        {/* File Name */}
                        <div>
                          <p className="text-xs text-muted-foreground">
                            File Name
                          </p>
                          <p className="text-sm font-medium text-foreground truncate">
                            {scan.file_name}
                          </p>
                        </div>

                        {/* Detection Status */}
                        <div
                          className={`p-4 rounded-lg ${
                            scan.tumor_detected
                              ? "bg-destructive/10 border border-destructive/20"
                              : "bg-success/10 border border-success/20"
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            {scan.tumor_detected ? (
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-success" />
                            )}
                            <h3 className="font-semibold text-sm">
                              {scan.tumor_detected
                                ? "Tumor Detected"
                                : "No Tumor"}
                            </h3>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Confidence:
                              </span>
                              <span className="font-semibold">
                                {scan.confidence}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Level:
                              </span>
                              <span className="font-semibold">
                                {scan.tumor_level}
                              </span>
                            </div>
                            {scan.tumor_type && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Type:
                                </span>
                                <span className="font-semibold">
                                  {scan.tumor_type}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Recommendations */}
                        {scan.recommendations &&
                          scan.recommendations.length > 0 && (
                            <div className="bg-muted/30 p-3 rounded-lg">
                              <h4 className="font-semibold text-xs text-foreground mb-2">
                                Recommendations:
                              </h4>
                              <ul className="space-y-1 text-xs text-muted-foreground">
                                {scan.recommendations.map((rec, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* Processing Time */}
                        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                          Processed in {scan.processing_time.toFixed(1)}s
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Comparison;
